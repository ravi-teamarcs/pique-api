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

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(BookingRequest)
    private readonly reqRepository: Repository<BookingRequest>,
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

    return {
      message: 'Booking created successfully',
      booking: bookingData,
      status: true,
    };
  }

  async handleBookingResponse(role, payload) {
    // console.log('Booking Service', role, payload);
    const { bookingId, ...data } = payload;

    if (role === 'entertainer') {
      const alreadyResponded = await this.bookingRepository.findOne({
        where: { id: bookingId, isAccepted: 'pending' },
      });
      if (!alreadyResponded) {
        return { message: 'You have already responded to this booking' };
      }
      data.isAccepted === 'rejected' ? (data.status = 'cancelled') : data;

      console.log('After Cancelling ', data);
      const booking = await this.bookingRepository.update(
        { id: bookingId },
        data,
      );
      if (!booking.affected) {
        throw new NotFoundException({
          message: 'Booking not found',
          status: false,
        });
      }

      return {
        message: `Request ${data.isAccepted} successfully`,
        status: true,
      };
    }

    if (role === 'venue') {
      const booking = await this.bookingRepository.update(
        { id: bookingId },
        data,
      );
      if (!booking.affected) {
        throw new NotFoundException({
          message: 'Booking not found',
          status: false,
        });
      }
    }

    return {
      message: `Booking request ${data.status}  successfully`,
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
}
