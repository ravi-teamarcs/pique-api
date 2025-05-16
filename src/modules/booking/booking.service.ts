import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { ChangeBooking } from '../venue/dto/change-booking.dto';
import { Venue } from '../venue/entities/venue.entity';
import { BookingRequest } from './entities/changeBooking.entity';
import { BookingReqResponse } from './dto/request-booking.dto';
import { ResponseDto } from './dto/booking-response-dto';
import { BookingLog } from './entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EmailService } from '../Email/email.service';
import { NotificationService } from '../notification/notification.service';
import { format } from 'date-fns';
import { GoogleCalendarServices } from '../google-calendar/google-calendar.service';
import { BookingCalendarSync } from './entities/booking-sync.entity';
import { AvailabilityService } from '../entertainer/availability.service';
import { EntertainerAvailability } from '../entertainer/entities/availability.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(BookingRequest)
    private readonly reqRepository: Repository<BookingRequest>,
    @InjectRepository(BookingLog)
    private readonly logRepository: Repository<BookingLog>,
    @InjectRepository(BookingLog)
    private readonly syncRepository: Repository<BookingCalendarSync>,
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    private readonly emailService: EmailService,
    private readonly notifyService: NotificationService,
    private readonly googleCalService: GoogleCalendarServices,
    private readonly configService: ConfigService,
  ) {}

  async createBooking(dto: CreateBookingDto, venueId: number) {
    const { entertainerId, ...bookingData } = dto;

    const booking = await this.bookingRepository.findOne({
      where: { entId: entertainerId, eventId: dto.eventId },
    });

    if (booking)
      throw new BadRequestException({
        message: 'Booking for event  already exists for this entertainer',
      });
    // Check for Availability
    const available = await this.checkAvailability(entertainerId, dto.showDate);

    if (!available)
      throw new BadRequestException(
        'Entertainer is not Available on requested date.',
      );

    // Create the booking
    const newBooking = this.bookingRepository.create({
      ...bookingData,
      venueId: venueId,
      entId: entertainerId,
    });

    // Save the booking
    if (!newBooking) {
      throw new Error('Failed to create booking');
    }

    // changes must be there
    const savedBooking = await this.bookingRepository.save(newBooking);

    if (!savedBooking) {
      throw new InternalServerErrorException('Failed to save Booking');
    }
    const entUserId = savedBooking.entId;

    const ent = await this.entRepository
      .createQueryBuilder('entertainer')
      .leftJoin('entertainer.user', 'user')
      .select(['entertainer.name AS name', 'user.email AS email'])
      .where('entertainer.id =:id', { id: entUserId })
      .getRawOne();

    const venue = await this.venueRepository
      .createQueryBuilder('venue')
      .leftJoin('venue.user', 'user')
      .select([
        'venue.name AS name',
        'user.email AS email',
        'user.phoneNumber AS phoneNumber',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
      ])
      .where('venue.id =:id', { id: venueId })
      .getRawOne();

    const emailPayload = {
      to: ent.email,
      subject: 'New Booking Request',
      templateName: 'booking-request.html',

      replacements: {
        venueName: venue.name,
        entertainerName: ent.name,
        bookingDate: savedBooking.showDate,
        bookingTime: savedBooking.showTime,
        vname: venue.name,
        vemail: venue.email,
        vphone: venue.phoneNumber,
        Address: `${venue.addressLine1}, ${venue.addressLine2}`,
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

    const payload = {
      bookingId: savedBooking.id,
      status: savedBooking.status,
      user: savedBooking.venueId,
      performedBy: 'venue',
    };

    this.generateBookingLog(payload);

    return {
      message: 'Booking created successfully',
      booking: bookingData,
      status: true,
    };
  }

  async handleBookingResponse(
    role: string,
    payload: ResponseDto,
    userId: number,
  ) {
    const { bookingId, status } = payload;

    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('users', 'vuser', 'vuser.id = venue.userId') // venue's user
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('users', 'euser', 'euser.id = entertainer.userId') // entertainer's user

      // Join venue table
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'booking.venueId AS vid',
        'booking.showTime AS showTime',
        'booking.showDate AS showDate',

        'euser.email AS eEmail',
        'euser.name AS ename',
        'euser.id AS eid ',
        'euser.phoneNumber AS ephone',

        'venue.name  As  vname',
        'vuser.email As vemail',
        'vuser.phoneNumber As vphone',
        'vuser.id As vid',

        'event.title AS  eventTitle',
        'event.description AS  eventDescription',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.eventDate AS eventDate',
      ])
      .where('booking.id = :id', { id: bookingId })
      .getRawOne();

    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }

    if (
      role === 'entertainer' &&
      !['invited', 'rescheduled'].includes(booking.status)
    ) {
      return {
        message: 'You have already responded to this booking',
        status: false,
      };
    }

    await this.bookingRepository.update({ id: booking.id }, { status });

    // New Logic starts
    if (status === 'confirmed') {
      const participants = [booking.venueId, booking.entId];

      for (const id of participants) {
        const data = await this.googleCalService.checkUserhasSyncCalendar(
          Number(id),
        );
        if (!data) continue;

        const GoogleEventPayload = {
          title: booking.eventTitle,
          description: booking.eventDescription,
          eventDate: booking.eventDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
        };

        const bookingRecord = await this.syncRepository.findOne({
          where: { bookingId: bookingId, userId: id },
        });

        if (!bookingRecord) {
          // save event to google calendar
          const res = await this.googleCalService.createCalendarEvent(
            data,
            GoogleEventPayload,
          );
          // save synced booking
          this.googleCalService.saveSyncedBooking(booking.id, id, res.id);
        }
      }
    }
    // Ends Here
    const emailPayload = {
      to: role === 'entertainer' ? booking.vemail : booking.eEmail,
      subject: `Booking Request ${status}`,
      templateName:
        role === 'entertainer'
          ? 'request-accepted.html'
          : 'confirmed-booking.html',

      replacements: {
        venueName: booking.vname,
        entertainerName: booking.ename,
        id: booking.id,
        bookingTime: booking.showTime,
        bookingDate: booking.showDate,
      },
    };

    this.emailService.handleSendEmail(emailPayload);

    // Notification Service  Booking (Venue and )

    this.notifyService.sendPush(
      {
        title: 'Booking Response',
        body: `${role.charAt(0).toUpperCase() + role.slice(1)} has ${status} the booking request.`,
        type: 'booking_response',
      },

      role === 'entertainer' ? booking.vid : booking.eid,
    );

    const log = await this.generateBookingLog({
      bookingId,
      status: status,
      user: userId,
      performedBy: role,
    });

    return {
      message: `Request ${status} successfully`,
      status: true,
    };
  }

  async handleChangeRequest(bookingdto: ChangeBooking, userId: number) {
    const { bookingId, reqShowDate, reqShowTime } = bookingdto;
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('users', 'user', 'user.id = booking.entId')
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'entertainer.id AS eid',
        'entertainer.entertainerName AS entertainer_name',
        'venue.id AS vuid',
        'user.id AS entertainer_user_id',
        'user.email AS entertainer_email',
        'event.id AS event_id',
        'event.title AS event_title',
      ])
      .where('booking.id = :id AND booking.venueId=:userId', {
        id: bookingId,
        userId,
      })
      .getRawOne();

    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }

    try {
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
        { status: 'rescheduled', showDate: reqShowDate, showTime: reqShowTime },
      );

      if (booking.entertainer_email) {
        // Send Email to Entertainer
        const emailPayload = {
          to: booking.entertainer_email,
          subject: `Event Date and Time Change`,
          templateName: 'modify-booking.html',
          replacements: {
            recipientName: booking.entertainer_name,
            bookingId: booking.id,
            newStartTime: booking.reqShowTime,
            newDate: booking.reqShowDate,
          },
        };
        this.emailService.handleSendEmail(emailPayload);

        // Send Notification to Entertainer

        this.notifyService.sendPush(
          {
            title: 'Event Date and Time Change',
            body: `Your booking with ID ${booking.id} has been rescheduled to ${booking.reqShowDate} at ${booking.reqShowTime}`,
            type: 'booking_date_time_change',
          },
          booking.entertainer_user_id,
        );
      }

      return {
        message:
          'Your Request for Time and Date  have registered Successfully.',
        status: true,
      };
    } catch (err) {
      throw new InternalServerErrorException({
        message: err.message,
        status: true,
      });
    }
  }

  // approve service for both Entertainer and Admin

  async approveChange(
    requestId: number,
    reqDto: BookingReqResponse,
    userId: number,
  ) {
    const { response } = reqDto;

    const request = await this.reqRepository.findOne({
      where: { id: requestId, euid: userId },
    });

    if (!request) {
      throw new NotFoundException({
        message: 'Request not found',
        status: false,
      });
    }

    try {
      const updatedRequest = await this.reqRepository.update(
        { id: requestId },
        { status: response },
      );
      if (!updatedRequest.affected) {
        throw new NotFoundException({
          message: 'Request not found',
          status: false,
        });
      }
      const res = response === 'approved' ? 'rescheduled' : 'confirmed';

      const booking = await this.bookingRepository.update(
        { id: request.bookingId },
        {
          status: res,
          showTime: request.reqShowTime,
          showDate: request.reqShowTime,
          eventId: request.reqEventId,
        },
      );

      this.notifyService.sendPush(
        {
          title: 'Booking Reschedule Request Update',
          body: `The entertainer has ${response} your request to change the date and time of the booking.`,
          type: 'change_date_time',
        },

        request.vuid,
      );

      const payload = {
        bookingId: request.bookingId,
        status: res,
        user: userId,
        performedBy: 'entertainer',
      };
      this.generateBookingLog(payload);

      return {
        message: `Request ${response} successfully`,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to approve request',
        status: false,
      });
    }
  }

  private async generateBookingLog(payload) {
    const { bookingId, user, status, performedBy } = payload;

    const log = this.logRepository.create({
      ...payload,
      date: new Date(),
    });

    await this.logRepository.save(log);

    return { message: 'Log generated Successfully', status: true };
  }

  async updateBookingStatus(dto, userId: number) {
    const updatedBookings = [];
    const { bookingIds, status } = dto;
    try {
      for (const bookingId of bookingIds) {
        const booking = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
          .leftJoin('users', 'vuser', 'vuser.id = venue.userId') // venue's user
          .leftJoin(
            'entertainers',
            'entertainer',
            'entertainer.id = booking.entId',
          )
          .leftJoin('users', 'euser', 'euser.id = entertainer.userId') // entertainer's user

          // Join venue table
          .select([
            'booking.id AS id',
            'booking.status AS status',
            'booking.venueId AS venueId',
            'booking.showTime AS showTime',
            'booking.showDate AS showDate',

            'euser.email AS eEmail',
            'euser.name AS ename',
            'euser.id AS eid ',
            'euser.phoneNumber AS ephone',

            'venue.name  As  vname',
            'vuser.email As vemail',
            'vuser.phoneNumber As vphone',
            'vuser.id As vid',
          ])
          .where('booking.id = :id', { id: bookingId })
          .getRawOne();

        if (!booking) {
          throw new NotFoundException({
            message: `Booking with ID ${bookingId} not found`,
          });
        }

        await this.bookingRepository.update({ id: bookingId }, { status });

        const logPayload = {
          bookingId,
          performedBy: 'venue',
          status,
          user: Number(booking.venueId),
        };
        await this.generateBookingLog(logPayload);

        if (booking.eEmail) {
          const formattedDate = format(booking.showDate, 'yyyy-MM-dd'); // e.g. '2025-05-01'

          const emailPayload = {
            to: booking.eEmail,
            subject: `Booking Request ${status}`,
            templateName:
              status === 'confirmed' ? 'confirmed-booking.html' : '',
            replacements: {
              venueName: booking.vname,
              entertainerName: booking.ename,
              id: booking.id,
              bookingTime: booking.showTime,
              bookingDate: formattedDate,
            },
          };

          this.emailService.handleSendEmail(emailPayload);

          this.notifyService.sendPush(
            {
              title: 'Booking Response',
              body: `venue has ${status} the booking request.`,
              type: 'booking_response',
            },

            booking.eid,
          );
        }
        updatedBookings.push(bookingId);
      }

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

  async checkAvailability(
    entertainerId: number,
    showDate: string,
  ): Promise<boolean> {
    const date = new Date(showDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const weekday = date.getDay();

    const availability = await this.availabilityRepository.findOne({
      where: { entertainer_id: entertainerId, year, month },
    });

    if (!availability) return true; // If not set, assume available

    const isUnavailable = availability.unavailable_dates.includes(showDate);
    const isOverride = availability.available_dates.includes(showDate);
    const isWeekdayBlocked =
      availability.unavailable_weekdays.includes(weekday);

    return !isUnavailable && (!isWeekdayBlocked || isOverride);
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
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category',
        )
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .select([
          'booking.id',
          'booking.showDate',
          'booking.showTime',
          'entertainer.name AS satge_name',
          'entertainer.entertainer_name',
          'entertainer.contact_person',
          'entertainer.performanceRole',
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
          'media',
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
        message: 'Entertainer Details based on Event',
        data: entertainers,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
