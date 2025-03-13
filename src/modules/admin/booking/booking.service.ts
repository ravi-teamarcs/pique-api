import {
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

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}
  async getAllBookings(query: BookingQueryDto) {
    const { page = 1, status = 'pending', pageSize = 10 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const [bookings, count] = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.venueUser', 'venueUser')
      .leftJoinAndSelect('booking.entertainerUser', 'entertainerUser')
      .where('booking.status = :status', { status })
      .select([
        'booking.id',
        'booking.status',
        'booking.venueId',
        'booking.showTime',
        'booking.showDate',
        'booking.eventId',
        'booking.specialNotes',
        'venueUser.id',
        'venueUser.name',
        'venueUser.email',
        'entertainerUser.id',
        'entertainerUser.name',
        'entertainerUser.email',
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
    const { venueUserId, entertainerId, ...data } = payload;
    try {
      const newBooking = this.bookingRepository.create({
        ...data,

        venueUser: { id: venueUserId },
        entertainerUser: { id: entertainerId },
      });
      await this.bookingRepository.save(newBooking);

      // Generate Booking Log
      return {
        Message: 'Booking created Successfully',
        status: true,
        data: newBooking,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async getAllBookingById(query: BookingQueryDto, userId: number) {
    try {
      const { page = 1, status = 'pending', pageSize = 10 } = query;
      const skip = (Number(page) - 1) * Number(pageSize);
      const [bookings, count] = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.venueUser', 'venueUser')
        .leftJoinAndSelect('booking.entertainerUser', 'entertainerUser')
        .where('booking.venueUser.id = :userId', { userId })
        .andWhere('booking.status = :status', { status })
        .select([
          'booking.id',
          'booking.status',
          'booking.venueId',
          'booking.showTime',
          'booking.showDate',
          'booking.eventId',
          'booking.specialNotes',
          'venueUser.id',
          'venueUser.name',
          'venueUser.email',
          'entertainerUser.id',
          'entertainerUser.name',
          'entertainerUser.email',
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

  async modifyBooking(payload: ModifyBookingDto) {
    const { bookingId, fieldsToUpdate } = payload;
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
      await this.bookingRepository.update({ id: booking.id }, fieldsToUpdate);
      return {
        message: 'Booking updated successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: error.status,
      });
    }
  }
}
