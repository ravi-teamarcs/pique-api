import {
  BadRequestException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
import { BookingRequest } from './entities/changeBooking.entity';
import { ResponseDto } from './dto/booking-response-dto';
import { BookingLog } from './entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EmailService } from '../Email/email.service';
import { NotificationService } from '../notification/notification.service';
import { getMonth, getYear, parse } from 'date-fns';
import { GoogleCalendarServices } from '../google-calendar/google-calendar.service';
import { BookingCalendarSync } from './entities/booking-sync.entity';
import { AvailabilityService } from '../entertainer/availability.service';
import { EntertainerAvailability } from '../entertainer/entities/availability.entity';
import { ConfigService } from '@nestjs/config';
import { VenueEvent } from '../event/entities/event.entity';
import { ModifyBookingDto } from './dto/update-booking.dto';
import {
  format,
  formatInTimeZone,
  utcToZonedTime,
  zonedTimeToUtc,
} from 'date-fns-tz';
import { getOverlappingSlots } from 'src/common/utils/slots-utils';
import { DateTime } from 'luxon';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceEvent } from '../admin/invoice/entities/invoices-event.entity';
import {
  formatUtcToTimezone,
  formatUtcToTimezoneParts,
} from 'src/common/utils/common.utils';
@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(BookingRequest)
    private readonly reqRepository: Repository<BookingRequest>,
    @InjectRepository(BookingLog)
    private readonly logRepository: Repository<BookingLog>,
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceEvent)
    private readonly invoiceEventRepository: Repository<InvoiceEvent>,
    private readonly emailService: EmailService,
    private readonly notifyService: NotificationService,
    private readonly googleCalService: GoogleCalendarServices,
    private readonly configService: ConfigService,
  ) {}

  async createBooking(dto: CreateBookingDto, venueId: number) {
    const { entertainerId, showStartDateTime, ...bookingData } = dto;

    try {
      const booking = await this.bookingRepository.findOne({
        where: { entId: entertainerId, eventId: dto.eventId },
      });

      if (booking)
        throw new BadRequestException({
          message: 'Invitaion for event already sent .',
        });

      // Check for availability Here

      const { eventStartDateTime, eventEndDateTime } =
        await this.eventRepository.findOne({
          where: { id: dto.eventId },
          select: ['eventStartDateTime', 'eventEndDateTime'],
        });

      console.log(
        'Event Start Date Time',
        eventStartDateTime,
        'eventEndDateTime',
        eventEndDateTime,
      );

      //  Issues are Here
      const availabilityPayload = {
        startTimeUtc: formatInTimeZone(
          new Date(eventStartDateTime),
          'UTC',
          "yyyy-MM-dd'T'HH:mm:ss'Z'",
        ),
        endTimeUtc: formatInTimeZone(
          new Date(eventEndDateTime),
          'UTC',
          "yyyy-MM-dd'T'HH:mm:ss'Z'",
        ),
        entertainerId,
      };

      const availability =
        await this.checkEntertainerAvailability(availabilityPayload);

      if (!availability)
        throw new BadRequestException(
          'Entertainer is not available in given time slot. ',
        );

      // Get Venue Timezone

      const { timezone } = await this.venueRepository.findOne({
        where: { id: venueId },
        select: ['timezone'],
      });

      const newBooking = this.bookingRepository.create({
        ...bookingData,
        showStartDateTime: zonedTimeToUtc(showStartDateTime, timezone ?? 'UTC'),
        venueId: venueId,
        entId: entertainerId,
      });

      // changes must be there
      const savedBooking = await this.bookingRepository.save(newBooking);

      console.log('Saved Booking', savedBooking);

      // update status of event to invited
      await this.eventRepository.update(
        { id: dto.eventId },
        { status: 'invited' },
      );

      const entUserId = savedBooking.entId;

      const ent = await this.entRepository
        .createQueryBuilder('entertainer')
        .leftJoin('entertainer.user', 'user')
        .select([
          'entertainer.name AS name',
          'entertainer.email AS entertainerEmail',
          'user.email AS userEmail',
          'user.id AS  userId',
        ])
        .where('entertainer.id =:id', { id: entUserId })
        .getRawOne();

      const venue = await this.venueRepository
        .createQueryBuilder('venue')
        .leftJoin('venue.user', 'user')

        .select([
          'venue.name AS name',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'venue.contactNumber AS contactNumber',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.timezone AS timeZone',
        ])
        .where('venue.id =:id', { id: venueId })
        .getRawOne();
      const event = await this.eventRepository.findOne({
        where: { id: savedBooking.eventId },
        select: ['slug', 'title'],
      });
      if (ent.entertainerEmail) {
        // let parsedTime = parse(savedBooking.showTime, 'HH:mm:ss', new Date());
        const { Date, Time } = formatUtcToTimezoneParts(
          eventStartDateTime,
          venue.timeZone,
        );
        const emailPayload = {
          to: ent.entertainerEmail || ent.userEmail,
          subject: 'New Booking Request',
          templateName: 'booking-request.html',
          replacements: {
            venueName: venue.name,
            eventName: event?.slug || '',
            entertainerName: ent.name,
            bookingDate: Date,
            bookingTime: Time,
            vname: venue.name,
            vemail: venue.email,
            vphone: venue.contactNumber,
            Address: `${venue.addressLine1},${venue.addressLine2}`,
          },
        };

        this.emailService.handleSendEmail(emailPayload);
        if (ent.userId) {
          this.notifyService.sendPush(
            {
              title: 'Booking Request',
              body: `You have new booking request from ${venue.name}`,
              type: 'booking_req',
            },
            ent.userId,
          );
        }
      }

      const payload = {
        bookingId: savedBooking.id,
        status: savedBooking.status,
        user: savedBooking.venueId,
        performedBy: 'venue',
      };

      this.generateBookingLog(payload);

      return {
        message: 'Invitation for event sent successfully .',
        booking: bookingData,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async handleBookingResponse(
    role: string,
    payload: ResponseDto,
    userId: number,
  ) {
    const { bookingId, status } = payload;

    try {
      const booking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')

        .leftJoin('users', 'vuser', 'vuser.id = venue.userId')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('users', 'euser', 'euser.id = entertainer.userId')

        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.venueId AS venueId',
          'booking.showStartDateTime AS showStartDateTime',
          `CONCAT(venue.addressLine1, ', ', venue.addressLine2) AS address`,
          'event.id AS eventId',
          'event.slug AS slug',
          'event.title AS title',

          'euser.email AS eEmail',
          'euser.name AS ename',
          'euser.id AS eid ',
          'entertainer.name AS stageName',
          'euser.phoneNumber AS ephone',
          'venue.name  AS  vname',
          'venue.zipCode  AS vZipCode',
          'venue.timezone AS  venueTimeZone',
          'vuser.email AS vemail',
          'vuser.phoneNumber AS vphone',
          'vuser.id AS vid',
          'event.title AS  eventTitle',
          'event.description AS  eventDescription',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
        ])
        .where('booking.id = :id', { id: bookingId })
        .getRawOne();

      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }

      if (
        role === 'entertainer' &&
        !['invited', 'rescheduled', 'reinvited'].includes(booking.status)
      ) {
        return {
          message: 'You have already responded to this booking',
          status: false,
        };
      }

      await this.bookingRepository.update({ id: booking.id }, { status });

      // Now Check
      if (status === 'canceled') {
        const invoiceMetaData = await this.invoiceEventRepository.findOne({
          where: { eventId: booking.eventId },
        });
        if (invoiceMetaData)
          await this.invoiceRepository.update(
            { id: invoiceMetaData.invoiceId },
            { isOutdated: true },
          );
      }
      if (booking.vemail) {
        const { Date: eventDate, Time } = formatUtcToTimezoneParts(
          booking.eventStartDateTime,
          booking.venueTimeZone,
        );

        const statusToTemplateMap = {
          applied: 'request-accepted.html',
          declined: 'entertainer-declined-booking.html',
          confirmed: 'entertainer-confirmed.html',
          canceled: 'entertainer-cancellation.html',
        };

        const statusToReplacementMap = {
          applied: {
            venueName: booking.vname,
            entertainerName: booking.stageName,
            eventName: booking.slug,
            id: booking.id,
            bookingTime: Time,
            bookingDate: eventDate,
          },

          declined: {
            venueName: booking.vname,
            eventTitle: booking.slug,
            eventDate: eventDate,
            eventTime: Time,
            entertainerName: booking.stageName,
          },
          confirmed: {
            eventName: booking.slug,
            EntertainerName: booking.stageName,
            venueName: booking.vname,
            Year: new Date().getFullYear(),
          },
          canceled: {
            venueName: booking.vname,
            eventTitle: booking.slug,
            entertainerName: booking.stageName,
            address: booking.address,
            eventDate: eventDate,
            eventTime: Time,
            year: new Date().getFullYear(),
          },
        };

        const template = statusToTemplateMap[status.toLowerCase()];

        const emailPayload = {
          to: booking.vemail,
          subject: `Booking Request ${status}`,
          templateName: template,
          replacements: statusToReplacementMap[status.toLowerCase()],
        };

        this.emailService.handleSendEmail(emailPayload);

        this.notifyService.sendPush(
          {
            title: 'Booking Response',
            body: `${role.charAt(0).toUpperCase() + role.slice(1)} ${booking.stageName} has ${status} the booking request.`,
            type: 'booking_response',
          },

          booking.vid,
        );
      }

      await this.generateBookingLog({
        bookingId,
        status: status,
        user: userId,
        performedBy: role,
      });

      return {
        message: `Request ${status} successfully`,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  // approve service for both Entertainer and Admin
  async handleChangeRequest(id: number, bookingdto: ModifyBookingDto) {
    const { eventStartDateTime, eventEndDateTime } = bookingdto;

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('users', 'user', 'user.id = entertainer.userId')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'entertainer.id AS eid',
        'entertainer.email AS email',
        'entertainer.entertainerName AS entertainerName',
        'venue.id AS vuid',
        'user.id AS entertainer_user_id',
        'user.email AS entertainer_email',
        'event.id AS event_id',
        'event.title AS event_title',
        'event.slug AS eventSlug',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.timezone AS venueTimeZone',
        'venue.zipCode AS zipCode',
        'city.name AS cityName',
        'state.name AS stateName',
      ])
      .where('booking.eventId = :id', { id })
      .getRawMany();

    if (!bookings || bookings.length === 0) {
      return;
    }

    try {
      for (const booking of bookings) {
        // Ignore status if lies in any one of them.
        const IGNORED_STATUSES = [
          'invited',
          'canceled',
          'declined',
          'completed',
        ];
        if (IGNORED_STATUSES.includes(booking.status)) continue;

        // Need changes Here (Fix this Date and Time issue)
        await this.bookingRepository.update(
          { id: booking.id },
          {
            status: 'rescheduled',
            showStartDateTime: eventStartDateTime,
          },
        );

        // Add a booking log for this rescheduled
        const payload = {
          bookingId: booking.id,
          status: 'rescheduled',
          user: booking.vuid,
          performedBy: 'venue',
        };

        this.generateBookingLog(payload);

        if (booking.email || booking.entertainer_email) {
          const { Date: eventDate, Time } = formatUtcToTimezoneParts(
            eventStartDateTime,
            booking.venueTimeZone ?? 'UTC',
          );
          const { Time: endTime } = formatUtcToTimezoneParts(
            eventEndDateTime,
            booking.venueTimeZone ?? 'UTC',
          );
          const emailPayload = {
            to: booking.email || booking.entertainer_email,
            subject: `Event Rescheduled`,
            templateName: 'modify-booking.html',
            replacements: {
              EntertainerName: booking.entertainerName,
              EventName: booking.eventSlug,
              NewTime: `${Time} to ${endTime}`,
              NewDate: eventDate,
              Location: `${booking.addressLine1 ?? ''}${booking.addressLine2 ?? ''},${booking.cityName} ,${booking.stateName} ${booking.zipCode} `,
              Year: new Date().getFullYear(),
            },
          };
          await this.emailService.handleSendEmail(emailPayload);

          // Send Notification to Entertainer
          this.notifyService.sendPush(
            {
              title: 'Event Rescheduled',
              body: `Your booking for event ${booking.event_title ?? booking.eventSlug} with venue ${booking?.venueName ?? ''} has been rescheduled to ${eventDate} at ${Time}`,
              type: 'booking_date_time_change',
            },
            booking.entertainer_user_id,
          );
        }
      }
      return {
        message:
          'Your request for date and time have been registered successfully.',
        status: true,
      };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  private async generateBookingLog(payload) {
    const log = this.logRepository.create({
      ...payload,
      date: new Date(),
    });
    await this.logRepository.save(log);
  }

  async updateBookingStatus(dto, userId: number) {
    const updatedBookings = [];
    const { bookingIds, status, eventIds } = dto;

    try {
      for (const bookingId of bookingIds) {
        const booking = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
          .leftJoin('event', 'event', 'event.id = booking.eventId')
          .leftJoin('users', 'vuser', 'vuser.id = venue.userId') // venue's user
          .leftJoin(
            'entertainers',
            'entertainer',
            'entertainer.id = booking.entId',
          )
          .leftJoin('users', 'euser', 'euser.id = entertainer.userId') // entertainer's user
          .select([
            'booking.id AS id',
            'booking.status AS status',
            'booking.venueId AS venueId',
            'booking.showStartDateTime AS showStartDateTime',
            'event.eventStartDateTime AS eventStartDateTime',
            'euser.email AS eEmail',
            'entertainer.email AS email',
            'euser.name AS ename',
            'euser.id AS eid ',
            'euser.phoneNumber AS ephone',
            'venue.name  AS  vname',
            'venue.timezone AS venueTimeZone',
            'vuser.email AS vemail',
            'vuser.phoneNumber AS vphone',
            'vuser.id AS vid',
          ])
          .where('booking.id = :id', { id: bookingId })
          .getRawOne();

        if (!booking) {
          throw new NotFoundException({
            message: `Booking with id ${bookingId} not found`,
          });
        }

        // update the booking status
        await this.bookingRepository.update({ id: bookingId }, { status });

        // After that  generate the booking log for this.
        const logPayload = {
          bookingId,
          performedBy: 'venue',
          status,
          user: Number(booking.venueId),
        };
        await this.generateBookingLog(logPayload);

        // Send email and push notification if email is available
        if (booking.email || booking.eEmail) {
          const { Date, Time } = formatUtcToTimezoneParts(
            booking.eventStartDateTime,
            booking.venueTimeZone,
          );
          const emailPayload = {
            to: booking.eEmail,
            subject: `Booking Request ${status}`,
            templateName:
              status === 'confirmed' ? 'confirmed-booking.html' : '',
            replacements: {
              venueName: booking.vname,
              entertainerName: booking.ename,
              id: booking.id,
              bookingTime: Time,
              bookingDate: Date,
            },
          };

          this.emailService.handleSendEmail(emailPayload);
          if (booking.eid) {
            this.notifyService.sendPush(
              {
                title: 'Booking Response',
                body: `${booking.vname} venue has ${status} the booking request.`,
                type: 'booking_response',
              },

              booking.eid,
            );
          }
        }
        updatedBookings.push(bookingId);
      }

      // Update the status of the event to confirmed
      await Promise.all(
        eventIds.map(
          async (eventId: number) =>
            await this.eventRepository.update(
              { id: eventId },
              { status: 'confirmed' },
            ),
        ),
      );

      // Check if the  changes made in the event whose invoice already generated outdated the invoice.
      for (const eventId of eventIds) {
        const invoiceMetaData = await this.invoiceEventRepository.findOne({
          where: { eventId },
        });
        if (invoiceMetaData)
          await this.invoiceRepository.update(
            { id: invoiceMetaData.invoiceId },
            { isOutdated: true },
          );
      }

      this.notSelectedforEvent(eventIds, updatedBookings, userId);

      return {
        message: 'Booking status updated successfully',
        data: updatedBookings,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async entertainerBookingDetailsByEvent(eventId: number, refId: number) {
    try {
      const bookingDetails = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('categories', 'cat', 'cat.id = booking.categoryId')
        .leftJoin('categories', 'subcat', 'subcat.id = booking.subcategoryId')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .select([
          'booking.id',
          'entertainer.name AS satge_name',
          'entertainer.entertainer_name',
          'entertainer.contact_person',
          'booking.status',
          'entertainer.contact_number',
          'subcat.name',
          'cat.name',
          'state.name',
          'city.name',
        ])
        .where('booking.eventId = :eventId AND booking.venueId = :venueId', {
          eventId,
          venueId: refId,
        })
        .getRawMany();
      return {
        message: 'Details returned successfully',
        status: true,
        data: bookingDetails,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEntertainerDetailsPerEvent(eventId: number, refId: number) {
    const baseUrl = this.configService.get<string>('BASE_URL');
    try {
      const entertainers = await this.bookingRepository
        .createQueryBuilder('book')
        .leftJoin('entertainers', 'ent', 'ent.id = book.entId')
        .leftJoin('event', 'event', 'event.id = book.eventId')
        .leftJoin(
          'entertainer_media',
          'media',
          'media.user_id = ent.id AND media.type ="headshot"',
        )
        .select([
          'ent.name AS stageName',
          'ent.id AS id',
          `CONCAT(:baseUrl, IFNULL(media.url, 'default.jpg')) AS mediaUrl`,
        ])
        .where('book.eventId = :eventId', { eventId })
        .andWhere('book.venueId = :refId', { refId })
        .andWhere('event.status = :status', { status: 'completed' })
        .setParameter('baseUrl', baseUrl)
        .getRawMany();

      return {
        message: 'Entertainer Details based on event',
        data: entertainers,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async notSelectedforEvent(
    eventIds: number[],
    confirmedBookings,
    venueId: number,
  ) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('users', 'user', 'user.id = entertainer.userId')
      .select([
        'booking.id AS id',
        'entertainer.entertainer_name AS entertainerName',
        'entertainer.email AS email',
        'user.email AS userEmail',
        'venue.name AS venueName',
        'venue.timezone AS venueTimeZone',
        'event.slug AS eventName',
        'event.eventStartDateTime AS eventStartDateTime',
        'event.eventEndDateTime AS eventEndDateTime',
        'user.id AS entId',
      ])
      .where('booking.eventId IN (:...eventIds)', { eventIds })
      .andWhere('booking.venueId = :venueId', { venueId })
      .getRawMany();

    if (bookings && bookings.length > 0) {
      const rejectedRequest = bookings.filter(
        (item) => !confirmedBookings.includes(item.id),
      );

      for (const req of rejectedRequest) {
        // Update the status of rest of the bookings to closed
        await this.bookingRepository.update(
          { id: req.id, status: In(['invited', 'applied']) },
          { status: 'closed' },
        );

        // Add a log entry for the booking
        const logPayload = {
          bookingId: req.id,
          status: 'closed',
          user: Number(venueId),
          performedBy: 'venue',
        };

        await this.generateBookingLog(logPayload);

        // Send email and push notification to entertainer
        if (req?.email || req?.userEmail) {
          const { Date, Time } = formatUtcToTimezoneParts(
            req.eventStartDateTime,
            req.venueTimeZone,
          );
          const emailPayload = {
            to: req.email,
            subject: `Event Position closed`,
            templateName: 'cancellation.html',
            replacements: {
              entertainerName: req.entertainerName,
              eventName: req.eventName,
              eventDate: `${Date} ${Time}`,
            },
          };

          await this.emailService.handleSendEmail(emailPayload);
          if (req?.entId) {
            this.notifyService.sendPush(
              {
                title: 'Position closed for the event.',
                body: `${req.venueName} has closed  the position for ${req.eventName} event . Thanks for your intreste. `,
                type: 'booking_response',
              },
              req.entId,
            );
          }
        }
      }
    }
  }

  // Availability Checks
  async checkEntertainerAvailability({
    startTimeUtc,
    endTimeUtc,
    entertainerId,
  }: {
    startTimeUtc: string;
    endTimeUtc: string;
    entertainerId: number;
  }): Promise<boolean> {
    // Get entertainer Timezone from  entertainer table .
    const entertainer = await this.entRepository.findOne({
      where: { id: entertainerId },
      select: ['timezone'],
    });

    if (!entertainer || entertainer.timezone === null) {
      return true; // Consider entertainer available
    }

    const { bookingDate, startTime, endTime, startLocal, year, month } =
      this.convertEventTimes(
        startTimeUtc,
        endTimeUtc,
        entertainer.timezone ?? 'UTC',
      );

    const availability = await this.availabilityRepository.findOne({
      where: { entertainer_id: entertainerId, year, month },
    });
    if (!availability) return true;

    const { unavailable_dates } = availability;

    const unavailable = unavailable_dates.find((u) => u.date === bookingDate);
    if (!unavailable) return true;
    if (unavailable.slots.includes('whole_day')) return false;

    // Helper function to get overlapping slots(returns an array of slot names)
    const bookingSlots = getOverlappingSlots(startTime, endTime);

    for (const slot of bookingSlots) {
      if (unavailable.slots.includes(slot)) {
        return false;
      }
    }

    return true;
  }

  convertEventTimes(
    startTimeUtc: string,
    endTimeUtc: string,
    entertainerTz: string,
  ) {
    // 1. Convert UTC → entertainer local
    const startLocal = utcToZonedTime(startTimeUtc, entertainerTz);
    const endLocal = utcToZonedTime(endTimeUtc, entertainerTz);
    const year = startLocal.getFullYear();
    const month = startLocal.getMonth() + 1;
    // 2. Extract local date and time
    const bookingDate = format(startLocal, 'yyyy-MM-dd', {
      timeZone: entertainerTz,
    });
    const startTime = format(startLocal, 'HH:mm', { timeZone: entertainerTz });
    const endTime = format(endLocal, 'HH:mm', { timeZone: entertainerTz });

    return {
      bookingDate,
      startTime,
      endTime,
      startLocal,
      endLocal,
      year,
      month,
    };
  }
}
