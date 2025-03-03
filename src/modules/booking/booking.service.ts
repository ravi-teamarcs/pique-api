import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { DateTimeChangeDto } from '../venue/dto/change-booking.dto';
import { Venue } from '../venue/entities/venue.entity';
import { BookingRequest } from './entities/changeReq.entity';
import { ReqBookingDto } from './dto/request-booking.dto';
import { ResponseDto } from './dto/booking-response-dto';
import { BookingLog } from './entities/booking-log.entity';
import { User } from '../users/entities/users.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EmailService } from '../Email/email.service';

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
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    private readonly emailService: EmailService,
  ) {}

  async createBooking(createBookingDto: CreateBookingDto, userId: number) {
    const { entertainerId, ...bookingData } = createBookingDto;

    // Create the booking

    const newBooking = this.bookingRepository.create({
      ...bookingData,
      venueUser: { id: userId },
      entertainerUser: { id: entertainerId },
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
    const entUserId = savedBooking.entertainerUser.id;

    const user = await this.entRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user')
      .select(['entertainer.name AS name', 'user.email AS email'])
      .where('user.id = :id', { id: entUserId })
      .getRawOne();

    const venue = await this.venueRepository.findOne({
      where: { id: savedBooking.venueId },
      select: ['name', 'email', 'phone', 'addressLine1', 'addressLine2'],
    });

    const emailPayload = {
      to: user.email,
      subject: 'New Booking Request',
      templateName: 'booking-request.html',

      replacements: {
        venueName: venue.name,
        entertainerName: user.name,
        bookingDate: savedBooking.showDate,
        bookingTime: savedBooking.showTime,
        vname: venue.name,
        vemail: venue.email,
        vphone: venue.phone,
        Address: `${venue.addressLine1}, ${venue.addressLine2}`,
      },
    };

    this.emailService.handleSendEmail(emailPayload);

    const payload = {
      bookingId: savedBooking.id,
      status: savedBooking.status,
      user: savedBooking.venueUser.id,
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
      .leftJoinAndSelect('booking.entertainerUser', 'entertainerUser')
      .leftJoinAndSelect('booking.venueUser', 'venueUser')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Join venue table
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'booking.venueId AS vid',
        'booking.showTime AS showTime',
        'booking.showDate AS showDate',

        'entertainerUser.email AS eEmail',
        'entertainerUser.name AS ename',
        'entertainerUser.id AS eid ',
        'entertainerUser.phoneNumber AS ephone',

        'venue.name  As  vname',
        'venueUser.email As vemail',
        'venueUser.phoneNumber As vphone',
        'venueUser.id As vid',
      ])
      .where('booking.id = :id', { id: bookingId })
      .getRawOne();

    console.log('Booking Response', booking);
    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }

    if (role === 'entertainer' && booking.status !== 'pending') {
      return {
        message: 'You have already responded to this booking',
        status: false,
      };
    }

    const updatedBooking = await this.bookingRepository.update(
      { id: booking.id },
      { status },
    );
    if (!updatedBooking.affected) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }

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

  async handleChangeRequest(
    dateTimeChangeDto: DateTimeChangeDto,
    userId: number,
  ) {
    const { bookingId, venueId } = dateTimeChangeDto;

    const venue = await this.venueRepository.findOne({
      where: { user: { id: userId }, id: venueId },
    });

    if (!venue) {
      throw new UnauthorizedException({
        message: 'You are not Authorized',
        status: false,
      });
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking || booking.venueId !== venueId) {
      throw new NotFoundException({
        message: 'Booking not found',
        status: false,
      });
    }

    const req = this.reqRepository.create({ ...dateTimeChangeDto, userId });

    const savedReq = await this.reqRepository.save(req);
    if (!savedReq) {
      throw new Error('Something Went Wrong');
    }

    await this.bookingRepository.update(
      { id: bookingId },
      { status: 'pending' },
    );

    // Use Firebase to send the Notification.

    return {
      message: 'Your Request have registered Successfully.',
      status: true,
    };
  }

  // approve service for both Entertainer and Admin

  async approveChange(requestId: number, reqDto: ReqBookingDto) {
    const { approverType, response, approverId } = reqDto;

    const request = await this.reqRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (approverType === 'entertainer') {
      const authorized = await this.bookingRepository.findOne({
        where: { id: request.bookingId, entertainerUser: { id: approverId } },
      });

      if (!authorized) throw new UnauthorizedException('You are not allowed');
    }

    if (approverType === 'entertainer') {
      request.entertainerApproval = response;
    } else if (approverType === 'admin') {
      request.adminApproval = response;
    }

    // If both approved, update booking
    if (request.entertainerApproval && request.adminApproval) {
      request.status = 'approved';

      // Make changes in actual Booking

      const updatedBooking = await this.bookingRepository.update(
        { id: request.bookingId },
        {
          showTime: request.reqShowTime,
          showDate: request.reqShowDate,
          status: 'confirmed',
        },
      );
    }

    // If both Entertainer and Administrator
    // Codes

    await this.reqRepository.save(request);

    return { message: 'response registered Successfully', status: 'true' };
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
}
