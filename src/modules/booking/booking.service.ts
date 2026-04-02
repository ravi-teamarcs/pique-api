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
import { In, Not, Repository } from 'typeorm';
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
import { EventCategorySubcategory } from '../event/entities/event-category-subcategory.entity';
import { BookingCategorySubcategory } from './entities/booking-category.entity';
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
    @InjectRepository(BookingCategorySubcategory)
    private readonly bookingCategoryRepository: Repository<BookingCategorySubcategory>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,

    private readonly emailService: EmailService,
    private readonly notifyService: NotificationService,
    private readonly googleCalService: GoogleCalendarServices,
    private readonly configService: ConfigService,
  ) {}

  async createBooking(dto: CreateBookingDto, venueId: number) {
    const { entertainerId, showStartDateTime, categories, ...bookingData } =
      dto;

    try {
      const booking = await this.bookingRepository.findOne({
        where: { entId: entertainerId, eventId: dto.eventId },
      });

      if (booking)
        throw new BadRequestException({
          message: 'Invitaion for event already sent .',
        });

      // Check for availability Here

      const record = await this.eventRepository.findOne({
        where: { id: dto.eventId },
        select: ['eventStartDateTime', 'eventEndDateTime'],
      });
      if (!record) throw new NotFoundException('Event not Found');
      const { eventStartDateTime, eventEndDateTime } = record;
      // Check

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

      // New Logic Here (For Mapping Creation)
      const bookingCategoryMappings = [];

      for (const category of dto.categories) {
        const { categoryId, subCategoryIds } = category;

        for (const subCategoryId of subCategoryIds) {
          const mapping = this.bookingCategoryRepository.create({
            eventId: dto.eventId,
            bookingId: savedBooking.id,
            categoryId,
            subCategoryId,
          });

          bookingCategoryMappings.push(mapping);
        }
      }

      // then save all at once
      await this.bookingCategoryRepository.save(bookingCategoryMappings);

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
          // 'invited',
          'canceled',
          'declined',
          'closed',
          'removed',
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
          if (booking.entertainer_user_id) {
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
      const rows = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')

        // Booking → Category/Subcategory mapping table
        .leftJoin(
          'booking_category_subcategory',
          'bcs',
          'bcs.booking_id = booking.id',
        )

        // categories table joined twice
        .leftJoin('categories', 'cat', 'cat.id = bcs.category_id')
        .leftJoin('categories', 'sub', 'sub.id = bcs.subcategory_id')

        .select([
          // EXISTING KEYS (Do NOT change)
          'booking.id AS booking_id',
          'booking.status AS booking_status',
          'entertainer.contact_person AS entertainer_contact_person',
          'entertainer.contact_number AS entertainer_contact_number',
          'state.name AS state_name',
          'city.name AS city_name',
          'entertainer.name AS satge_name',
          'entertainer.entertainer_name AS entertainer_name',
          'booking.entertainers AS entertainers',

          // New category/subcategory fields
          'cat.id AS category_id',
          'cat.name AS category_name',
          'sub.id AS subcategory_id',
          'sub.name AS subcategory_name',
        ])
        .where('booking.eventId = :eventId AND booking.venueId = :venueId', {
          eventId,
          venueId: refId,
        })
        .getRawMany();

      // Group data by booking
      const grouped = {};

      rows.forEach((row) => {
        const bId = row.booking_id;

        if (!grouped[bId]) {
          grouped[bId] = {
            booking_id: row.booking_id,
            booking_status: row.booking_status,
            entertainer_contact_person: row.entertainer_contact_person,
            entertainer_contact_number: row.entertainer_contact_number,
            state_name: row.state_name,
            city_name: row.city_name,
            satge_name: row.satge_name,
            entertainer_name: row.entertainer_name,
            entertainers: row.entertainers
              ? JSON.parse(row.entertainers)
              : null,

            // final required format
            categories: [],
          };
        }

        // if category exists
        if (row.category_id) {
          let cat = grouped[bId].categories.find(
            (c) => c.categoryId === row.category_id,
          );

          if (!cat) {
            cat = {
              categoryId: row.category_id,
              categoryName: row.category_name,
              subCategories: [],
            };
            grouped[bId].categories.push(cat);
          }

          // add subcategory if exists
          if (row.subcategory_id) {
            const exists = cat.subCategories.some(
              (s) => s.subCategoryId === row.subcategory_id,
            );

            if (!exists) {
              cat.subCategories.push({
                subCategoryId: row.subcategory_id,
                subCategoryName: row.subcategory_name,
              });
            }
          }
        }
      });

      return {
        message: 'Details returned successfully',
        status: true,
        data: Object.values(grouped),
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

  async inviteEntertainerForSeries(eventMappings: any[]) {
    try {
      const details: any[] = [];

      // Extract all eventIds
      const eventIds: number[] = eventMappings.map((em) => Number(em.eventId));

      // 1️⃣ Fetch all events
      const events = await this.eventRepository.find({
        where: { id: In(eventIds) },
        select: [
          'id',
          'eventStartDateTime',
          'eventEndDateTime',
          'venueId',
          'slug',
        ],
      });

      if (!events.length)
        return { message: 'No events found', records: [], total: 0 };

      // 2️⃣ Fetch event-category-subcategory mappings
      const eventCategoryMappings = await this.eventCategoriesRepository.find({
        where: {
          event: { id: In(eventIds) },
        },
        relations: ['event'],
        select: {
          id: true, // ✅ selects id of EventCategorySubcategory
          event: { id: true }, // ✅ only get event.id (not full event)
          categoryId: true,
          subCategoryId: true,
        },
      });

      // Group by eventId
      const eventCategoryMap = eventCategoryMappings.reduce(
        (acc, cur) => {
          if (!acc[cur?.event?.id]) acc[cur?.event?.id] = [];
          acc[cur?.event?.id].push({
            categoryId: Number(cur.categoryId),
            subCategoryId: Number(cur.subCategoryId),
          });
          return acc;
        },
        {} as Record<number, { categoryId: number; subCategoryId: number }[]>,
      );

      // 3️⃣ Loop through each event mapping
      for (const mapping of eventMappings) {
        const { eventId, entertainers } = mapping;
        const event = events.find((e) => e.id === eventId);
        if (!event) continue;

        const eventCategories = eventCategoryMap[event.id] || [];

        // Get venue details for the event
        const venue = await this.venueRepository
          .createQueryBuilder('venue')
          .leftJoin('venue.user', 'user')
          .leftJoin('cities', 'city', 'city.id = venue.city')
          .leftJoin('states', 'state', 'state.id = venue.state')
          .select([
            'venue.name AS name',
            'user.email AS email',
            'user.phoneNumber AS phoneNumber',
            'venue.contactNumber AS contactNumber',
            'venue.addressLine1 AS addressLine1',
            'venue.addressLine2 AS addressLine2',
            'city.name AS cityName',
            'state.name AS stateName',
            'venue.zipCode AS zipCode',
            'venue.timezone AS venueTimeZone',
          ])
          .where('venue.id = :id', { id: event.venueId })
          .getRawOne();

        let anyInvitedForThisEvent = false;

        // 4️⃣ Loop through each entertainer for this event
        for (const entertainer of entertainers) {
          try {
            const entId = Number(entertainer.entertainerId);
            const categories = Array.isArray(entertainer.categories)
              ? entertainer.categories
              : [];

            // Check if already invited/booked
            const alreadyBooked = await this.bookingRepository.findOne({
              where: { entId, eventId: event.id, status: Not('canceled') },
            });

            const Entertainer = await this.entRepository
              .createQueryBuilder('entertainer')
              .leftJoin('entertainer.user', 'user')
              .select([
                'entertainer.name AS name',
                'entertainer.email AS email',
                'user.email AS userEmail',
                'user.id AS userId',
              ])
              .where('entertainer.id = :id', { id: entId })
              .getRawOne();

            if (alreadyBooked) {
              details.push({
                entertainerId: entId,
                entertainerName: Entertainer?.name ?? null,
                eventId: event.id,
                eventSlug: event.slug,
                available: false,
                message: 'Invitation already sent for this event.',
              });
              continue;
            }

            // ✅ Match entertainer categories with event categories
            let hasMatch = false;
            const bookingCategoryMappings = [];

            for (const eventCat of eventCategories) {
              const foundCategory = categories.find(
                (cat) => Number(cat.categoryId) === Number(eventCat.categoryId),
              );

              const subMatch = foundCategory?.subCategoryIds?.find(
                (sid) => Number(sid) === Number(eventCat.subCategoryId),
              );

              if (foundCategory && subMatch) {
                hasMatch = true;
                const mapping = this.bookingCategoryRepository.create({
                  bookingId: null, // will set after booking save
                  eventId: event.id,
                  categoryId: eventCat.categoryId,
                  subCategoryId: eventCat.subCategoryId,
                });
                bookingCategoryMappings.push(mapping);
              }
            }

            if (!hasMatch) {
              details.push({
                entertainerId: entId,
                entertainerName: Entertainer?.name ?? null,
                eventId: event.id,
                eventSlug: event.slug,
                available: false,
                message:
                  'Entertainer does not match any event category/subcategory.',
              });
              continue;
            }

            // ✅ Availability check
            let isAvailable = false;
            try {
              const availabilityPayload = {
                startTimeUtc: formatInTimeZone(
                  new Date(event.eventStartDateTime),
                  'UTC',
                  "yyyy-MM-dd'T'HH:mm:ss'Z'",
                ),
                endTimeUtc: formatInTimeZone(
                  new Date(event.eventEndDateTime),
                  'UTC',
                  "yyyy-MM-dd'T'HH:mm:ss'Z'",
                ),
                entertainerId: entId,
              };
              isAvailable =
                await this.checkEntertainerAvailability(availabilityPayload);
            } catch (err) {
              console.warn(
                `Error checking availability for entertainer ${entId} on event ${event.id}:`,
                err?.message ?? err,
              );
              isAvailable = false;
            }

            if (!isAvailable) {
              details.push({
                entertainerId: entId,
                entertainerName: Entertainer?.name ?? null,
                eventId: event.id,
                eventSlug: event.slug,
                available: false,
                message: 'Entertainer unavailable for this schedule.',
              });
              continue;
            }

            // ✅ Create booking
            const newBooking = this.bookingRepository.create({
              venueId: event.venueId,
              entId,
              eventId: event.id,
              status: 'invited',
              showStartDateTime: formatInTimeZone(
                new Date(event.eventStartDateTime),
                'UTC',
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
              ),
            });

            const savedBooking = await this.bookingRepository.save(newBooking);

            // ✅ Save category mappings for this booking
            for (const mapping of bookingCategoryMappings) {
              mapping.bookingId = savedBooking.id;
            }

            if (bookingCategoryMappings.length > 0) {
              await this.bookingCategoryRepository.save(
                bookingCategoryMappings,
              );
            }

            // ✅ Log
            const logPayload = this.logRepository.create({
              bookingId: savedBooking.id,
              performedBy: 'admin',
              status: 'invited',
              user: null,
            });
            await this.logRepository.save(logPayload);

            // ✅ Send notification/email
            if (Entertainer?.email || Entertainer?.userEmail) {
              const { Date: eventDate, Time: startTime } =
                formatUtcToTimezoneParts(
                  event.eventStartDateTime,
                  venue.venueTimeZone,
                );
              const { Time: endTime } = formatUtcToTimezoneParts(
                event.eventEndDateTime,
                venue.venueTimeZone,
              );

              const emailPayload = {
                to: Entertainer.email || Entertainer.userEmail,
                subject: 'New Booking Request',
                templateName: 'booking-request.html',
                replacements: {
                  venueName: venue.name,
                  eventName: event?.slug || '',
                  entertainerName: Entertainer.name,
                  bookingDate: eventDate,
                  bookingTime: `${startTime} to ${endTime}`,
                  vname: venue.name,
                  vemail: venue.email,
                  vphone: venue.contactNumber,
                  Address: `${venue.addressLine1}, ${venue.addressLine2}, ${venue.cityName}, ${venue.stateName}, ${venue.zipCode}`,
                },
              };

              this.emailService.handleSendEmail(emailPayload);
              this.notifyService.sendPush(
                {
                  title: 'Booking Request',
                  body: `You have a new invitation from ${venue.name}`,
                  type: 'booking_req',
                },
                Entertainer.userId,
              );
            }

            details.push({
              entertainerId: entId,
              entertainerName: Entertainer?.name ?? null,
              eventSlug: event.slug,
              eventId: event.id,
              available: true,
              message: 'Booking created successfully.',
              bookingId: savedBooking.id,
            });

            anyInvitedForThisEvent = true;
          } catch (innerErr) {
            console.error('Error processing entertainer:', innerErr);
            details.push({
              entertainerId: entertainer?.entertainerId ?? null,
              eventId: event.id,
              available: false,
              message: `Error processing entertainer: ${innerErr?.message ?? innerErr}`,
            });
            continue;
          }
        }

        if (anyInvitedForThisEvent) {
          await this.eventRepository.update(
            { id: event.id },
            { status: 'invited' },
          );
        }
      }

      return {
        message: 'Entertainers invited successfully.',
        status: true,
        data: details,
      };
    } catch (error) {
      console.error('inviteEntertainerForSeries Error:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
