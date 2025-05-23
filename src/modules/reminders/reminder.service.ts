import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { VenueEvent } from '../event/entities/event.entity';
import {
  addHours,
  differenceInDays,
  format,
  isAfter,
  subHours,
} from 'date-fns';
import { EmailService } from '../Email/email.service';
import { BookingReminder } from './entities/booking-reminder.entity';
import { BookLater } from './dto/book-later.dto';
import { AdminUser } from '../admin/auth/entities/AdminUser.entity';

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(VenueEvent)
    private readonly eventRepo: Repository<VenueEvent>,
    @InjectRepository(BookingReminder)
    private readonly bookReminderRepo: Repository<BookingReminder>,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    private readonly notifyService: NotificationService,
    private readonly emailService: EmailService,
  ) {}
  async eventReminder() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .select([
        'venue.userId AS venueUser',
        'entertainer.userId AS entUser',
        'event.title AS eventTitle',
        'event.description AS eventDescription',
        'event.eventDate As eventDate',
        'booking.id AS bookingId',
      ])
      .where('booking.status = :status', { status: 'confirmed' })
      .andWhere('event.eventDate > :today', {
        today: today.toISOString().split('T')[0],
      })
      .getRawMany();

    for (const booking of futureBookings) {
      const eventDate = new Date(booking.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil(
        (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if ([30, 10, 1].includes(daysLeft)) {
        const message = `Reminder: Your event "${booking.eventTitle}" is in ${daysLeft} day(s).`;

        const venueUser = booking.venueUser;
        const entertainerUser = booking.entUser;

        const notificationPayload = {
          title: `${daysLeft} days left to ${booking.eventTitle}`,
          body: message,
          type: 'event_reminder',
        };
        // Send reminders
        if (venueUser) {
          await this.notifyService.saveNotification(
            venueUser,
            notificationPayload,
          );
          await this.notifyService.sendPush(notificationPayload, venueUser);
        }
        if (entertainerUser) {
          await this.notifyService.saveNotification(
            entertainerUser,
            notificationPayload,
          );
          await this.notifyService.sendPush(
            notificationPayload,
            entertainerUser,
          );
        }

        // Optional: log or save that reminder was sent for this day
      }
    }
  }

  async remindUnrespondedInvites() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const today = new Date();

    const unrespondedBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .select([
        'booking.id AS bookingId',
        'booking.createdAt AS createdAt',
        'entertainer.userId AS entertainerUser',
      ])
      .where('booking.status = :status', { status: 'invited' })
      .andWhere('booking.createdAt <= :threeDaysAgo', {
        threeDaysAgo: threeDaysAgo.toISOString(),
      })
      .getRawMany();

    for (const booking of unrespondedBookings) {
      const daysPassed = differenceInDays(today, new Date(booking.createdAt));
      const message = `Reminder: You have a booking invitation (ID: ${booking.bookingId}) pending for over ${daysPassed} days. Please respond.`;

      const notificationPayload = {
        title: 'Pending Booking Response',
        body: message,
        type: 'booking_invitation_reminder',
      };

      if (booking.entertainerUser) {
        await this.notifyService.sendPush(
          notificationPayload,
          booking.entertainerUser,
        );
      }
      let admins = await this.adminRepository.find({ where: { role: '1' } });
      if (admins?.length > 0) {
        for (const admin of admins) {
          await this.notifyService.saveAdminNotification(
            notificationPayload,
            Number(admin.id),
          );
          await this.notifyService.sendAdminPush(
            notificationPayload,
            Number(admin.id),
          );
        }
      }
    }
  }

  async handleEventCompletionReminders() {
    try {
      const now = new Date();
      const confirmedEvents = await this.findConfirmedEvents();
      if (confirmedEvents && confirmedEvents.length < 1) return;

      for (const event of confirmedEvents) {
        // const actualDate = event.eventDate.toISOString().split('T')[0];
        const eventEnd = new Date(`${event.eventDate}T${event.endTime}`); // Assuming ISO strings
        const oneHourLater = addHours(eventEnd, 1);
        const twentyFourLater = addHours(eventEnd, 24);

        // First reminder after 1 hour
        if (isAfter(now, oneHourLater) && !event.emailSentAfter1Hour) {
          await this.findRelatedBooking(event.id);
          await this.eventRepo.update(
            { id: event.id },
            { emailSentAfter1Hour: true },
          );
        }

        // Second reminder after 24 hours
        if (isAfter(now, twentyFourLater) && !event.emailSentAfter24Hour) {
          await this.findRelatedBooking(event.id);
          await this.eventRepo.update(
            { id: event.id },
            { emailSentAfter24Hour: true },
          );
        }
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async findConfirmedEvents() {
    try {
      const events = await this.eventRepo.find({
        where: { status: 'confirmed' },
        select: [
          'title',
          'endTime',
          'startTime',
          'eventDate',
          'slug',
          'id',
          'emailSentAfter1Hour',
          'emailSentAfter24Hour',
        ],
      });
      return events;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findRelatedBooking(eventId: number) {
    const venue = await this.eventRepo
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('users', 'user', 'user.id = venue.userId')
      .select([
        'user.email AS email',
        'event.slug AS eventName',
        ' event.eventDate AS eventDate',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'venue.name AS venueName',
      ])
      .where('event.id =:eventId', { eventId })
      .getRawOne();
    if (venue.email) {
      const emailPayload = {
        to: venue.email,
        subject: `Reminder for Event Status`,
        templateName: 'venue-completion-reminder.html',
        replacements: {
          eventName: venue.eventName,
          venueName: venue.venueName,
          eventDate: format(venue.eventDate, 'dd MM yyyy'),
        },
      };
      this.emailService.handleSendEmail(emailPayload);
    }

    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
      .leftJoin('users', 'user', 'user.id = ent.userId')
      .select([
        'ent.entertainerName AS entertainerName',
        'user.email AS email',
        'event.slug AS eventName',
        ' event.eventDate AS eventDate',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'venue.name AS venueName',
      ])
      .where('booking.eventId = :eventId', { eventId })
      .getRawMany();

    for (const book of bookings) {
      if (book.email) {
        const emailPayload = {
          to: book.email,
          subject: `Reminder for booking status`,
          templateName: 'entertainer-completion-reminder.html',
          replacements: {
            entertainerName: book.entertainerName,
            eventName: book.id,
            venueName: book.venueName,
            eventDate: format(book.eventDate, 'dd MM yyyy'),
          },
        };
        this.emailService.handleSendEmail(emailPayload);
      }
    }
  }

  async handleReminders() {
    const oneHourAgo = subHours(new Date(), 1);
    const reminders = await this.bookReminderRepo
      .createQueryBuilder('reminder')
      .leftJoin('venue', 'venue', 'venue.id = reminder.venue_id') // if you have relation
      .leftJoin('users', 'user', 'user.id = venue.id') // if you have relation
      .leftJoin(
        'entertainers',
        'entertainer',
        'entertainer.id = reminder.entertainer_id',
      ) // if you have relation
      .select([
        'reminder.id As id',
        'venue.name AS venueName',
        'user.email AS email',
        'entertainer.name AS stageName',
      ])
      .where('reminder.createdAt <= :oneHourAgo', { oneHourAgo })
      .andWhere('reminder.isOneHourEmailSent = :flag', { flag: false })
      .getRawMany();

    for (const reminder of reminders) {
      const emailPayload = {
        to: reminder.email,
        subject: `Reminder for booking status`,
        templateName: 'entertainer-completion-reminder.html',
        replacements: {
          entertainerName: reminder.entertainerName,
          venueName: reminder.venueName,
          bookingLink: 'http://dummyBooking',
        },
      };
      await this.emailService.handleSendEmail(emailPayload);
      await this.bookReminderRepo.update(
        { id: reminder.id },
        { isOneHourEmailSent: true },
      );
    }
    await this.finalBookingReminder();
  }

  async saveBookingReminder(dto: BookLater) {
    const reminder = this.bookReminderRepo.create(dto);
    await this.bookReminderRepo.save(reminder);
    return { message: 'Booking Reminder stored Successfully', status: true };
  }

  async finalBookingReminder() {
    const twentyFourHoursAgo = subHours(new Date(), 24);

    const reminders = await this.bookReminderRepo
      .createQueryBuilder('reminder')
      .leftJoin('venue', 'venue', 'venue.id = reminder.venue_id') // if you have relation
      .leftJoin('users', 'user', 'user.id = venue.id') // if you have relation
      .leftJoin(
        'entertainers',
        'entertainer',
        'entertainer.id = reminder.entertainer_id',
      ) // if you have relation
      .select([
        'reminder.id AS id',
        'venue.name AS venueName',
        'user.email AS email',
        'entertainer.name AS stageName',
      ])
      .where('reminder.createdAt <= :twentyFourHoursAgo', {
        twentyFourHoursAgo,
      })
      .andWhere('reminder.isOneHourEmailSent = :flag', { flag: false })
      .getRawMany();

    if (reminders.length > 0) {
      for (const reminder of reminders) {
        if (reminder.email) {
          const emailPayload = {
            to: reminder.email,
            subject: `Reminder for booking status`,
            templateName: 'entertainer-completion-reminder.html',
            replacements: {
              entertainerName: reminder.stageName,
              venueName: reminder.venueName,
              bookingLink: 'http://dummyBooking',
            },
          };
          await this.emailService.handleSendEmail(emailPayload);
        }
        // Mark the 1-hour email as sent

        await this.bookReminderRepo.update(
          { id: reminder.id },
          { isTwentyFourHourEmailSent: true },
        );
      }
    }
  }
}
