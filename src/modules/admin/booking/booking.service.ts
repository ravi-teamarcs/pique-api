import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { AdminBookingDto } from './dto/admin-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { AdminBookingResponseDto } from './dto/admin-booking-response.dto';
import { ModifyBookingDto } from './dto/modify.booking.dto';
import { EmailService } from 'src/modules/Email/email.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { BookingRequest } from './entities/modify-booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Event } from '../events/entities/event.entity';
import { BookingLog } from './entities/booking-log.entity';
import { Venue } from '../venue/entities/venue.entity';
import {
  format,
  formatInTimeZone,
  utcToZonedTime,
  zonedTimeToUtc,
} from 'date-fns-tz';
import { Invoice } from '../invoice/entities/invoices.entity';
import { InvoiceEvent } from '../invoice/entities/invoices-event.entity';
import { getOverlappingSlots } from 'src/common/utils/slots-utils';
import { getMonth, getYear } from 'date-fns';
import { EntertainerAvailability } from '../entertainer/entities/entertainer-availability.entity';
import { Neighbourhood } from '../venue/entities/neighbourhood.entity';
import { formatUtcToTimezoneParts } from 'src/common/utils/common.utils';
import { BADRESP } from 'dns';
import { BookingCategorySubcategory } from 'src/modules/booking/entities/booking-category.entity';
import { EventCategorySubcategory } from '../events/entities/event-category-subcategory.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceEvent)
    private readonly invoiceEventRepository: Repository<InvoiceEvent>,
    @InjectRepository(BookingLog)
    private readonly logRepository: Repository<BookingLog>,
    @InjectRepository(BookingCategorySubcategory)
    private readonly bookingCategoryRepository: Repository<BookingCategorySubcategory>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,

    @InjectRepository(BookingRequest)
    private readonly reqRepository: Repository<BookingRequest>,
    private readonly notifyService: NotificationService,
    private readonly emailService: EmailService,
  ) {}
  async getAllBookings(query: BookingQueryDto) {
    const { page = 1, status = 'pending', pageSize = 10 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const [bookings, count] = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id=booking.venueId')
      .leftJoin('entertainers', 'ent', 'ent.id=booking.entId')
      .where('booking.status = :status', { status })
      .select([
        'booking.id',
        'booking.status',
        'booking.venueId',
        'booking.showTime',
        'booking.eventId',
        'booking.specialNotes',
        'ent.name',
      ])

      .skip(Number(skip))
      .take(Number(pageSize))
      .getManyAndCount();

    return {
      messsage: 'Bookings returned Successfully',
      pageSize,
      page,
      totalCount: count,
      data: bookings,
      status: true,
    };
  }

  async createBooking(payload: AdminBookingDto) {
    const { venueId, entertainers, showStartDateTime, eventId, ...data } =
      payload;

    console.log(' check entertainers', JSON.stringify(entertainers));
    const details = [];

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    try {
      // Fetch venue details once
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
        .where('venue.id =:id', { id: venueId })
        .getRawOne();

      for (const entData of entertainers) {
        const { entertainerId, categories } = entData;
        let savedBooking;
        let isReinvited = false;

        // Check if entertainer already booked
        const alreadyBooked = await this.bookingRepository.findOne({
          where: { entId: entertainerId, eventId },
        });

        if (alreadyBooked) {
          if (
            alreadyBooked.status === 'removed' ||
            alreadyBooked.status === 'closed'
          ) {
            isReinvited = true;
          } else {
            throw new BadRequestException({
              message: `Entertainer (ID: ${entertainerId}) already booked for this event.`,
            });
          }
        }

        // Fetch entertainer info
        const entertainer = await this.entertainerRepository
          .createQueryBuilder('entertainer')
          .leftJoin('entertainer.user', 'user')
          .select([
            'entertainer.name AS name',
            'entertainer.email AS email',
            'user.email AS userEmail',
            'user.id AS userId',
          ])
          .where('entertainer.id =:id', { id: entertainerId })
          .getRawOne();

        // Check availability
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
          entertainerId,
        };

        const availability =
          await this.checkEntertainerAvailability(availabilityPayload);

        if (!availability) {
          details.push({
            entertainerId,
            eventSlug: event?.slug ?? '',
            entertainerName: entertainer.name || '',
            available: false,
            message: 'Entertainer is unavailable during this time.',
          });
          continue;
        }

        // Create or reinvite booking
        if (isReinvited) {
          await this.bookingRepository.update(
            { id: alreadyBooked.id },
            { status: 'reinvited' },
          );
        } else {
          const newBooking = this.bookingRepository.create({
            ...data,
            venueId,
            entId: entertainerId,
            eventId,
            showStartDateTime: zonedTimeToUtc(
              showStartDateTime,
              venue.venueTimeZone ?? 'UTC',
            ),
            status: 'invited',
            entertainers: entertainers,
          });

          savedBooking = await this.bookingRepository.save(newBooking);

          // Save category–subcategory mappings
          const bookingCategoryMappings = [];
          for (const category of categories) {
            const { categoryId, subCategoryIds } = category;
            for (const subCategoryId of subCategoryIds) {
              const mapping = this.bookingCategoryRepository.create({
                eventId,
                bookingId: savedBooking.id,
                categoryId,
                subCategoryId,
              });
              bookingCategoryMappings.push(mapping);
            }
          }
          await this.bookingCategoryRepository.save(bookingCategoryMappings);

          details.push({
            entertainerId,
            available: true,
            eventSlug: event?.slug ?? '',
            entertainerName: entertainer.name || '',
            message: 'Booking created successfully.',
            bookingId: savedBooking.id,
          });
        }

        // Log the booking
        const logPayload = this.logRepository.create({
          bookingId: isReinvited ? alreadyBooked.id : savedBooking.id,
          performedBy: 'admin',
          status: 'invited',
          user: null,
        });
        await this.logRepository.save(logPayload);

        // Send email & notification
        if (entertainer?.email || entertainer?.userEmail) {
          const { Date: eventDate, Time: startTime } = formatUtcToTimezoneParts(
            event.eventStartDateTime,
            venue.venueTimeZone,
          );
          const { Time: endTime } = formatUtcToTimezoneParts(
            event.eventEndDateTime,
            venue.venueTimeZone,
          );

          const emailPayload = {
            to: entertainer.email || entertainer.userEmail,
            subject: 'New Booking Request',
            templateName: 'booking-request.html',
            replacements: {
              venueName: venue.name,
              eventName: event?.slug || '',
              entertainerName: entertainer.name,
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
              body: `You have a new booking request from ${venue.name}`,
              type: 'booking_req',
            },
            entertainer.userId,
          );
        }
      }

      // Update event status
      await this.eventRepository.update(
        { id: event.id },
        { status: 'invited' },
      );

      return {
        message: 'Invitation for event sent successfully',
        data: details,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async bookingResponse(payload: AdminBookingResponseDto) {
    const { bookingId, status } = payload;

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }
    try {
      await this.bookingRepository.update({ id: booking.id }, { status });
      return {
        message: `Booking ${status} Successfully`,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async getBookingListing(fromDate, toDate) {
    try {
      const res = await this.entertainerRepository
        .createQueryBuilder('entertainers')
        .select([
          'event.id AS event_id',
          'event.title AS event_title',
          'event.description AS event_description',
          'event.slug AS event_slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.status AS event_status',
          'event.sub_venue_id AS sub_venue_id',
          'code.StateCode AS stateCode',
          'state.name AS stateName',
          'country.name AS countryName',
          'city.name AS cityName',
          'booking.id AS booking_id',
          'booking.status AS booking_status',
          'booking.entId AS booking_ent_id',
          'entertainers.id AS entertainer_id',
          'entertainers.name AS stageName',
          'entertainers.entertainerName AS entertainerName',

          'invoice.id AS ent_invoice_id',
          'invoice.total_with_tax AS totalAmount',
          'invoice.status AS ent_invoiceStatus',
          'invoice.invoice_number AS invoiceNumber',
          'invoice.payment_method AS paymentMethod',
          'invoice.cheque_no AS chequeNo',
          'invoice.inv_amount_paid AS invAmountPaid',
          'invoice.payment_date AS paymentDate',

          'inv.id AS venueInvoiceId',
          'inv.total_with_tax AS venueTotalAmount',
          'inv.status AS venueInvoiceStatus',
          'inv.invoice_number AS venueInvoiceNumber',
          'inv.payment_method AS venuePaymentMethod',
          'inv.cheque_no AS venueChequeNo',
          'inv.inv_amount_paid AS venueInvAmountPaid',
          'inv.payment_date AS venuePaymentDate',
          'venue.name AS venueName',
          'venue.timezone AS venueTimeZone',

          'hood.name AS neighbourhood_name',
          'city.name AS  venueCityName',
          'state.name AS  venueStateName',
          'log.venueConfirmation',
        ])
        .where('entertainers.status=:status', { status: 'active' })
        .where('DATE(event.eventStartDateTime) BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('booking.status IN (:...status)', {
          status: [
            'confirmed',
            'invited',
            'declined',
            'canceled',
            'rescheduled',
            'completed',
            'applied',
          ],
        })

        .leftJoin('booking', 'booking', 'booking.entId = entertainers.id')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .leftJoin('categories', 'cat', 'cat.id = entertainers.category')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainers.specific_category AND subcat.parentId = entertainers.category',
        )
        .leftJoin(
          'invoice_bookings',
          'invmap',
          'invmap.booking_id = booking.id',
        )
        .leftJoin('countries', 'country', 'country.id = venue.country')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .leftJoin('cities', 'city', 'city.id = venue.city')

        .leftJoin(
          'invoices',
          'invoice',
          'invoice.id = invmap.invoice_id AND booking.entId = invoice.user_id',
        )
        .leftJoin(
          'invoices',
          'inv',
          'inv.event_id = event.id AND inv.user_id = event.venueId',
        )
        .leftJoin(
          (qb) =>
            qb
              .select('booking_log.bookingId', 'bookingId')
              .addSelect(
                `MAX(
    CASE 
      WHEN booking_log.performedBy IN ('venue', 'admin') 
        AND booking_log.status = 'confirmed' 
      THEN booking_log.createdAt 
      ELSE NULL 
    END
  )`,
                'venueConfirmation',
              )

              .from('booking_log', 'booking_log')
              .groupBy('booking_log.bookingId'),
          'log',
          'log.bookingId = booking.id',
        )

        .orderBy('DATE(event.eventStartDateTime)', 'ASC')
        .getRawMany();

      return {
        message: 'Booking Listing Fetched Successfully',
        data: res,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async handleChangeRequest(id: number, bookingdto: ModifyBookingDto) {
    const { eventStartDateTime, eventEndDateTime } = bookingdto;

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('users', 'user', 'user.id = entertainer.userId')

      .select([
        'booking.id AS id',
        'booking.status AS status',
        'entertainer.id AS eid',
        'entertainer.entertainerName AS entertainerName',
        'venue.id AS vuid',
        'user.id AS entertainer_user_id',
        'user.email AS entertainer_email',
        'event.id AS event_id',
        'event.title AS event_title',
        'event.slug AS eventSlug',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.timezone AS venueTimeZone',
      ])
      .where('booking.eventId = :id', { id })
      .getRawMany();

    if (!bookings || bookings.length === 0) return;

    try {
      for (const booking of bookings) {
        const IGNORED_STATUSES = [
          // 'invited',
          'canceled',
          'declined',
          'closed',
          'removed',
          'completed',
        ];
        if (IGNORED_STATUSES.includes(booking.status)) continue;

        const bookReq = this.reqRepository.create({
          ...bookingdto,
          vuid: booking.vuid,
          euid: booking.eid,
          reqEventId: booking.eventId,
        });

        await this.reqRepository.save(bookReq);

        // This updates the booking
        await this.bookingRepository.update(
          { id: booking.id },
          {
            status: 'rescheduled',
            showStartDateTime: eventStartDateTime,
          },
        );

        if (booking.entertainer_email) {
          // Send Email to Entertainer

          const { Date: eventDate, Time: startTime } = formatUtcToTimezoneParts(
            eventStartDateTime,
            booking.venueTimeZone,
          );
          const { Time: endTime } = formatUtcToTimezoneParts(
            eventEndDateTime,
            booking.venueTimeZone,
          );
          const emailPayload = {
            to: booking.entertainer_email,
            subject: `Event Rescheduled`,
            templateName: 'modify-booking.html',
            replacements: {
              EntertainerName: booking.entertainerName,
              EventName: booking.eventSlug,
              NewTime: `${startTime} to ${endTime}`,
              NewDate: eventDate,
              Location: `${booking.addressLine1 ?? ''}${booking.addressLine2 ?? ''}`,
              Year: new Date().getFullYear(),
            },
          };
          await this.emailService.handleSendEmail(emailPayload);

          // Send Notification to Entertainer
          if (booking.entertainer_user_id) {
            this.notifyService.sendPush(
              {
                title: 'Event Date and Time Change',
                body: `Your booking for event ${booking.eventSlug || booking.event_title} has been rescheduled to ${eventDate} at ${startTime}`,
                type: 'booking_date_time_change',
              },
              booking.entertainer_user_id,
            );
          }
        }
      }

      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id =  event.venueId')
        .leftJoin('users', 'user', 'user.id = venue.userId')
        .select([
          'event.id AS id',
          'event.title AS title',
          'event.slug AS slugName',
          'user.id AS userId',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime  AS eventEndDateTime',
          'venue.timezone AS venueTimeZone',
        ])
        .where('event.id = :eventId', { eventId: id })
        .getRawOne();

      const { Date: eventDate, Time: startTime } = formatUtcToTimezoneParts(
        eventStartDateTime,
        event.venueTimeZone,
      );
      const { Time: endTime } = formatUtcToTimezoneParts(
        eventEndDateTime,
        event.venueTimeZone,
      );

      this.notifyService.sendPush(
        {
          title: 'Event Date and Time Change',
          body: `Your Event ${event?.slugName || event?.title}has been rescheduled to ${eventDate} at ${startTime}-${endTime}`,
          type: 'booking_date_time_change',
        },
        event.userId,
      );

      return {
        message:
          'Your Request for Time and Date  have registered Successfully.',
        status: true,
      };
    } catch (err) {
      throw new InternalServerErrorException({
        message: err.message,
        status: false,
      });
    }
  }

  async removeBooking(bookingId: number) {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
      });

      await this.bookingRepository.delete({ id: booking.id });
      return {
        message: 'Booking deleted successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async removeEntertainerFromBooking(bookingId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) throw new BadRequestException('Booking not found');
    try {
      if (booking.status === 'confirmed') {
        const invoiceMetaData = await this.invoiceEventRepository.findOne({
          where: { eventId: booking.eventId },
        });

        if (invoiceMetaData)
          await this.invoiceRepository.update(
            { id: invoiceMetaData.invoiceId },
            { isOutdated: true },
          );
      }

      await this.bookingRepository.update(
        { id: bookingId },
        { status: 'removed' },
      );

      // Log the removal Action
      const logPayload = this.logRepository.create({
        bookingId,
        performedBy: 'admin',
        status: 'removed',
        user: null,
        date: new Date(),
      });
      await this.logRepository.save(logPayload);

      return {
        message: 'Entertainer booking removed successfully.',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

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
    const entertainer = await this.entertainerRepository.findOne({
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

  async toggleCloseBookings(payload) {
    const { eventId, sendEmail } = payload.payload;
    const bookingsToClose = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('users', 'user', 'user.id = entertainer.userId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
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
      .where('booking.eventId = :eventId', { eventId })
      .andWhere('booking.emailSentOnClose = :emailStatus', {
        emailStatus: false,
      })
      .andWhere('booking.status IN (:...bookingStatuses)', {
        bookingStatuses: ['invited', 'applied', 'reinvited', 'rescheduled'],
      })
      .getRawMany();

    for (const booking of bookingsToClose) {
      // 2. Update booking status to closed
      await this.bookingRepository.update(
        { id: booking.id },
        { status: 'closed' },
      );

      // After Updating the booking status  set the status of toggle flag to flase

      if (sendEmail) {
        if (booking?.email || booking?.userEmail) {
          const { Date: eventDate, Time: startTime } = formatUtcToTimezoneParts(
            booking.eventStartDateTime,
            booking.venueTimeZone,
          );

          const emailPayload = {
            to: booking.email,
            subject: `Event Position closed`,
            templateName: 'cancellation.html',
            replacements: {
              entertainerName: booking.entertainerName,
              eventName: booking.eventName,
              eventDate: ` ${eventDate} ${startTime}`,
            },
          };

          await this.emailService.handleSendEmail(emailPayload);
          if (booking?.entId) {
            this.notifyService.sendPush(
              {
                title: 'Position closed for the event.',
                body: `${booking.venueName} has closed  the position for ${booking.eventName} event . Thanks for your intreste. `,
                type: 'booking_response',
              },
              booking.entId,
            );
          }
        }
      }

      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });
      await this.eventRepository.update(
        { id: event?.id },
        { isCloseToggleActive: false },
      );
    }
    return { message: 'Booking closed sucessfully', status: true };
  }

  // async inviteEntertainerForSeries(eventIds: number[], entertainers) {
  //   try {
  //     // Suppose you have list of events

  //     const details = [];
  //     for (const eventId of eventIds) {
  //       const event = await this.eventRepository.findOne({
  //         where: { id: eventId },
  //         select: [
  //           'eventStartDateTime',
  //           'eventEndDateTime',
  //           'venueId',
  //           'id',
  //           'categoryId',
  //           'subCategoryId',
  //         ],
  //       });
  //       if (!event) continue;

  //       const venue = await this.venueRepository
  //         .createQueryBuilder('venue')
  //         .leftJoin('venue.user', 'user')
  //         .leftJoin('cities', 'city', 'city.id = venue.city')
  //         .leftJoin('states', 'state', 'state.id = venue.state')
  //         .select([
  //           'venue.name AS name',
  //           'user.email AS email',
  //           'user.phoneNumber AS phoneNumber',
  //           'venue.contactNumber AS contactNumber',
  //           'venue.addressLine1 AS addressLine1',
  //           'venue.addressLine2 AS addressLine2',
  //           'city.name AS cityName',
  //           'state.name AS stateName',
  //           'venue.zipCode AS zipCode',
  //           'venue.timezone AS venueTimeZone',
  //         ])
  //         .where('venue.id =:id', { id: event.venueId })
  //         .getRawOne();

  //       for (const entertainer of entertainers) {
  //         const alreadyBooked = await this.bookingRepository.findOne({
  //           where: { entId: entertainer.entertainerId, eventId: event.id },
  //         });

  //         if (alreadyBooked) {
  //           details.push({
  //             entertainerId: entertainer.entertainerId,
  //             eventId: event.id,
  //             available: false,
  //             message:
  //               'invitation is already sent to this entertainer for event.',
  //           });

  //           continue;
  //           // throw new BadRequestException('Already invited');
  //         }

  //         if (
  //           entertainer.categoryId !== event.categoryId ||
  //           entertainer.subCategoryId !== event.subCategoryId
  //         )
  //           continue;

  //         const availabilityPayload = {
  //           startTimeUtc: formatInTimeZone(
  //             new Date(event.eventStartDateTime),
  //             'UTC',
  //             "yyyy-MM-dd'T'HH:mm:ss'Z'",
  //           ),
  //           endTimeUtc: formatInTimeZone(
  //             new Date(event.eventEndDateTime),
  //             'UTC',
  //             "yyyy-MM-dd'T'HH:mm:ss'Z'",
  //           ),
  //           entertainerId: entertainer.entertainerId,
  //         };

  //         const availability =
  //           await this.checkEntertainerAvailability(availabilityPayload);

  //         if (!availability)
  //           return details.push({
  //             entertainerId: entertainer.entertainerId,
  //             eventId: event.id,
  //             available: false,
  //             message: 'Entertainer is unavailable during this time.',
  //           });

  //         const newBooking = this.bookingRepository.create({
  //           venueId: event.venueId,
  //           entId: entertainer.entertainerId,
  //           eventId: event.id,
  //           categoryId: entertainer.categoryId,
  //           subcategoryId: entertainer.subCategoryId,
  //           status: 'invited',
  //           showStartDateTime: formatInTimeZone(
  //             new Date(event.eventStartDateTime),
  //             'UTC',
  //             "yyyy-MM-dd'T'HH:mm:ss'Z'",
  //           ),
  //         });
  //         const savedBooking = await this.bookingRepository.save(newBooking);

  //         details.push({
  //           entertainerId: entertainer.entertainerId,
  //           eventId: event.id,
  //           available: true,
  //           message: 'Booking created successfully.',
  //           bookingId: savedBooking.id,
  //         });

  //         const logPayload = this.logRepository.create({
  //           bookingId: savedBooking.id,
  //           performedBy: 'admin',
  //           status: 'invited',
  //           user: null,
  //         });

  //         await this.logRepository.save(logPayload);

  //         const Entertainer = await this.entertainerRepository
  //           .createQueryBuilder('entertainer')
  //           .leftJoin('entertainer.user', 'user')
  //           .select([
  //             'entertainer.name AS name',
  //             'entertainer.email AS email',
  //             'user.email AS userEmail',
  //             'user.id AS  userId',
  //           ])
  //           .where('entertainer.id =:id', { id: entertainer.entertainerId })
  //           .getRawOne();

  //         // Send Email to the Entertainer
  //         if (Entertainer?.email || Entertainer?.userEmail) {
  //           const { Date: eventDate, Time: startTime } =
  //             formatUtcToTimezoneParts(
  //               event.eventStartDateTime,
  //               venue.venueTimeZone,
  //             );
  //           const { Time: endTime } = formatUtcToTimezoneParts(
  //             event.eventEndDateTime,
  //             venue.venueTimeZone,
  //           );
  //           const emailPayload = {
  //             to: Entertainer.email || Entertainer.userEmail,
  //             subject: 'New Booking Request',
  //             templateName: 'booking-request.html',
  //             replacements: {
  //               venueName: venue.name,
  //               eventName: event?.slug || '',
  //               entertainerName: Entertainer.name,
  //               bookingDate: eventDate,
  //               bookingTime: `${startTime} to ${endTime}`,
  //               vname: venue.name,
  //               vemail: venue.email,
  //               vphone: venue.contactNumber,
  //               Address: `${venue.addressLine1},${venue.addressLine2} ,${venue.cityName}, ${venue.stateName}, ${venue.zipCode}`,
  //             },
  //           };

  //           this.emailService.handleSendEmail(emailPayload);
  //           this.notifyService.sendPush(
  //             {
  //               title: 'Booking Request',
  //               body: `You have new invitation from ${venue.name}`,
  //               type: 'booking_req',
  //             },
  //             Entertainer.userId,
  //           );
  //         }
  //       }

  //       // Update the status After Sending invite to All.
  //       await this.eventRepository.update(
  //         { id: event.id },
  //         { status: 'invited' },
  //       );
  //     }
  //     return {
  //       message: 'Entertainer invited for series successfully',
  //       status: true,
  //       data: details,
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  async inviteEntertainerForSeries(eventIds: number[], entertainers: any[]) {
    try {
      const details: any[] = [];

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
          event: {
            id: In(eventIds),
          },
        },
        relations: ['event'], // include relation if you need event details (optional)
        select: {
          categoryId: true,
          subCategoryId: true,
          event: {
            id: true,
          },
        },
      });

      // Group by eventId
      const eventCategoryMap = eventCategoryMappings.reduce(
        (acc, cur) => {
          if (!acc[cur.event.id]) acc[cur.event.id] = [];
          acc[cur?.event?.id].push({
            categoryId: Number(cur.categoryId),
            subCategoryId: Number(cur.subCategoryId),
          });
          return acc;
        },
        {} as Record<number, { categoryId: number; subCategoryId: number }[]>,
      );

      // 3️⃣ Loop through each event
      for (const event of events) {
        if (!event) continue;

        const eventCategories = eventCategoryMap[event.id] || [];

        // Get venue details for the event (only once per event)
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

        // 4️⃣ Loop through entertainers
        for (const entertainer of entertainers) {
          try {
            const entId = Number(entertainer.entertainerId);

            // Check if already invited/booked
            const alreadyBooked = await this.bookingRepository.findOne({
              where: { entId, eventId: event.id, status: Not('canceled') },
            });

            const Entertainer = await this.entertainerRepository
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

            // ✅ Extract entertainer categories (frontend structure)
            const categories = Array.isArray(entertainer.categories)
              ? entertainer.categories
              : [];

            let matchedCategory: any = null;
            let matchedSubcategory: any = null;

            // ✅ Match event categories with entertainer’s categories
            for (const eventCat of eventCategories) {
              const foundCategory = categories.find(
                (c) => Number(c.id) === Number(eventCat.categoryId),
              );

              const foundSub = foundCategory?.specific_category?.find(
                (sc) => Number(sc.id) === Number(eventCat.subCategoryId),
              );

              if (foundCategory && foundSub) {
                matchedCategory = eventCat;
                matchedSubcategory = foundSub;
                break;
              }
            }

            if (!matchedCategory || !matchedSubcategory) {
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
              categoryId: matchedCategory.categoryId,
              subcategoryId: matchedCategory.subCategoryId,
              status: 'invited',
              showStartDateTime: formatInTimeZone(
                new Date(event.eventStartDateTime),
                'UTC',
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
              ),
            });

            const savedBooking = await this.bookingRepository.save(newBooking);

            const logPayload = this.logRepository.create({
              bookingId: savedBooking.id,
              performedBy: 'admin',
              status: 'invited',
              user: null,
            });
            await this.logRepository.save(logPayload);

            // ✅ Email/push notification
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

        // Mark event as invited if any successful booking
        if (anyInvitedForThisEvent) {
          await this.eventRepository.update(
            { id: event.id },
            { status: 'invited' },
          );
        }
      }

      return {
        message: 'Entertainers invited for series successfully.',
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
