import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async createBooking(createBookingDto: CreateBookingDto, userId: number) {
    const { entertainerId, ...bookingData } = createBookingDto;

    // Validate the venue refrence to the current User.
    // const venue = await this.venueRepository.findOne({
    //   where: { id: venueId, user: { id: userId } },
    // });

    // if (!venue) {
    //   throw new UnauthorizedException({
    //     message: 'Access Denied',
    //     reason: "Cannot create booking for others' venue.",
    //   });
    // }

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
    // const { createdAt, updatedAt, ...bookingData } = savedBooking;
    return { message: 'Booking created successfully', booking: bookingData };
  }
}
