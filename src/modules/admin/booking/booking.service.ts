import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { format } from 'date-fns-tz';
import { Invoice } from '../invoice/entities/invoices.entity';
import { InvoiceEvent } from '../invoice/entities/invoices-event.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
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
        'booking.showDate',
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
    const { venueId, entertainerIds, ...data } = payload;
    const details = [];

    const event = await this.eventRepository.findOne({
      where: { id: payload.eventId },
    });

    // if (['published', 'unpublished'].includes(event.status)) {
    //   throw new BadRequestException({
    //     message: `Can not book for event with status ${event.status} `,
    //     status: false,
    //   });
    // }

    try {
      // Fetch venue Details Only Once
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
        ])
        .where('venue.id =:id', { id: venueId })
        .getRawOne();

      for (const entertainerId of entertainerIds) {
        const alreadyBooked = await this.bookingRepository.findOne({
          where: { entId: entertainerId, eventId: data.eventId },
        });

        if (alreadyBooked) {
          throw new BadRequestException({
            message: `Entertainer with id  ${entertainerId} Already booked for event `,
          });
        }

        const newBooking = this.bookingRepository.create({
          ...data,
          venueId: venueId,
          entId: entertainerId,
        });
        const savedBooking = await this.bookingRepository.save(newBooking);

        const logPayload = this.logRepository.create({
          bookingId: newBooking.id,
          performedBy: 'admin',
          status: 'invited',
          user: null,
        });

        await this.logRepository.save(logPayload);
        details.push(savedBooking);
        // fetch entertainer details  every time

        const entertainer = await this.entertainerRepository
          .createQueryBuilder('entertainer')
          .leftJoin('entertainer.user', 'user')
          .select(['entertainer.name AS name', 'user.email AS email'])
          .where('entertainer.id =:id', { id: entertainerId })
          .getRawOne();

        // Send Email to the Entertainer
        if (entertainer?.email) {
          const emailPayload = {
            to: entertainer.email,
            subject: 'New Booking Request',
            templateName: 'booking-request.html',
            replacements: {
              venueName: venue.name,
              eventName: event?.slug || '',
              entertainerName: entertainer.name,
              bookingDate: format(
                savedBooking.showStartDateTime,
                'dd MMM yyyy',
                {
                  timeZone: 'UTC',
                },
              ),
              bookingTime: format(savedBooking.showStartDateTime, 'HH:mm', {
                timeZone: 'UTC',
              }),
              vname: venue.name,
              vemail: venue.email,
              vphone: venue.contactNumber,
              Address: `${venue.addressLine1},${venue.addressLine2}`,
            },
          };

          this.emailService.handleSendEmail(emailPayload);
          this.notifyService.sendPush(
            {
              title: 'Booking Request',
              body: `You have new booking request from ${venue.name}`,
              type: 'booking_req',
            },
            entertainerId,
          );
        }
      }

      // As soon as the booking is created, we update the event status to 'invited'.(Event status Updated.)
      await this.eventRepository.update(
        { id: event.id },
        { status: 'invited' },
      );

      return {
        message: 'Booking created Successfully',
        data: details,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getAllBookingById(query: BookingQueryDto, userId: number) {
    try {
      const { page = 1, status = 'pending', pageSize = 10 } = query;
      const skip = (Number(page) - 1) * Number(pageSize);
      const [bookings, count] = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id=booking.venueId')
        .leftJoin('entertainers', 'ent', 'ent.id=booking.entId')
        .where('booking.venueUser.id = :userId', { userId })
        .andWhere('booking.status = :status', { status })
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.venueId AS venueId',
          'booking.showTime AS show',
          'booking.showDate',
          'booking.eventId',
          'booking.specialNotes',
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
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
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
          'event.startTime AS event_endTime',

          'event.endTime AS event_startTime',
          'event.eventDate AS event_eventDate',
          // Added two  fields Here
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
          'cat.name AS categoryName',
          'subcat.name AS specificCategoryName',

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
          'venue.name As venueName',
          'hood.name AS neighbourhood_name',
          'city.name AS  venueCityName',
          'state.name AS  venueStateName',
          'log.venueConfirmation',
        ])
        .where('entertainers.status=:status', { status: 'active' })
        .where('event.eventStartDateTime BETWEEN :from AND :to', {
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
            'accepted',
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

        .orderBy('event.eventDate', 'ASC')
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
    const { reqShowDate, reqShowTime } = bookingdto;

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
      ])
      .where('booking.eventId = :id', { id })
      .getRawMany();

    try {
      for (const booking of bookings) {
        const IGNORED_STATUSES = [
          'invited',
          'canceled',
          'declined',
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
            showDate: reqShowDate,
            showTime: reqShowTime,
          },
        );

        if (booking.entertainer_email) {
          // Send Email to Entertainer
          const newTime = format(
            new Date(`1970-01-01T${reqShowTime.slice(0, 5)}:00`),
            'hh:mm a',
          );
          const newDate = format(reqShowDate, 'dd MMM yyyy');
          const emailPayload = {
            to: booking.entertainer_email,
            subject: `Event Date and Time Change`,
            templateName: 'modify-booking.html',
            replacements: {
              EntertainerName: booking.entertainerName,
              EventName: booking.eventSlug,
              NewTime: newTime,
              NewDate: newDate,
              Location: `${booking.addressLine1 ?? ''}${booking.addressLine2 ?? ''}`,
              Year: new Date().getFullYear(),
            },
          };
          await this.emailService.handleSendEmail(emailPayload);

          // Send Notification to Entertainer

          this.notifyService.sendPush(
            {
              title: 'Event Date and Time Change',
              body: `Your booking with ID ${booking.id} has been rescheduled to ${newDate} at ${newTime}`,
              type: 'booking_date_time_change',
            },
            booking.entertainer_user_id,
          );
        }
      }
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

    if (!booking) throw new BadRequestException('Booking Not Found');
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
      return {
        message: 'Entertainer booking remove successfully.',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
