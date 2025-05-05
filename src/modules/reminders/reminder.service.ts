import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly notifyService: NotificationService,
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
      const message = `Reminder: You have a booking invitation (ID: ${booking.bookingId}) pending for over 3 days. Please respond.`;

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

      // Optional: track that the reminder was sent
    }
  }
}
