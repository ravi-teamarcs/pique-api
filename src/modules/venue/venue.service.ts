import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { SearchEntertainerDto } from './dto/serach-entertainer.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { User } from '../users/entities/users.entity';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async create(createVenueDto: CreateVenueDto, userId: number): Promise<Venue> {
    // const existingVenue = await this.venueRepository.findOne({
    //   where: { user: { id: userId } },
    // });

    // if (existingVenue) {
    //   throw new BadRequestException('Venue already exists for the user');
    // }

    const venue = this.venueRepository.create({
      ...createVenueDto,
      user: { id: userId },
    });
    return await this.venueRepository.save(venue);
  }

  async findAllByUser(userId: number): Promise<Venue[]> {
    return this.venueRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findOneByUser(id: number, userId: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async findByAvailabilityAndType(query: SearchEntertainerDto) {
    const { availability, type } = query;
    const entertainers = await this.entertainerRepository.find({
      where: { availability: availability, type: type },
      select: [
        'id',
        'name',
        'type',
        'bio',

        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',

        'vaccinated',
        'availability',
        'status',
        'socialLinks',
      ],
    });
    return { message: 'Entertainers fetched Sucessfully', entertainers };
  }

  async findAllEntertainers() {
    const entertainers = await this.entertainerRepository.find({
      select: [
        'id',
        'name',
        'type',
        'bio',

        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',

        'vaccinated',
        'availability',
        'status',
        'socialLinks',
      ],
    });
    if (!entertainers) {
      throw new Error('No entertainers found');
    }

    return { message: 'Entertainers returned successfully', entertainers };
  }

  // To find Booking related to Venue user
  async findAllBooking(userId: number) {
    console.log(userId);
    const bookings = await this.bookingRepository.find({
      where: { venueUser: { id: userId } },
    });

    if (!bookings) {
      throw new Error('No bookings found');
    }

    return { message: 'Bookings returned successfully', bookings };
  }

  // async handleBookingResponse(bookingId: number, status) {
  //   const booking = await this.bookingRepository.update(
  //     { id: bookingId },
  //     { status: status },
  //   );
  //   console.log('booking updated', booking);
  //   if (!booking.affected) {
  //     throw new NotFoundException('Booking not found');
  //   }

  //   return { message: 'Response registered successfully' };
  // }
}
