import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { SearchEntertainerDto } from './dto/search-entertainer.dto';
import { Booking } from '../booking/entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async create(createVenueDto: CreateVenueDto, userId: number) {
    const venue = this.venueRepository.create({
      ...createVenueDto,
      user: { id: userId },
    });
    const createdVenue = await this.venueRepository.save(venue);
    if (!createdVenue) {
      throw new Error('Venue creation failed');
    }
    const { createdAt, updatedAt, ...venueDetails } = createdVenue;

    return { message: 'Venue created Successfully ', venueDetails };
  }

  async findAllByUser(userId: number): Promise<Venue[]> {
    return this.venueRepository.find({
      where: { user: { id: userId } },
      select: ['id', 'name', 'location', 'contactInfo'],
    });
  }

  async findOneByUser(id: number, userId: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id, user: { id: userId } },
      select: ['id', 'name', 'location', 'contactInfo'],
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }
  async findByAvailabilityAndType(searchEntertainerDto: SearchEntertainerDto) {
    const { availability, type } = searchEntertainerDto;

    const entertainers = await this.entertainerRepository.find({
      where: { availability: availability, type: type },
      select: [
        'id',
        'name',
        'type',
        'bio',
        'headshotUrl',
        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',
        'mediaUrl',
        'vaccinated',
        'availability',
        'status',
        'socialLinks',
      ],
    });
    return { message: '', entertainers };
  }

  async findAllEntertainers() {
    const entertainers = await this.entertainerRepository.find({
      select: [
        'id',
        'name',
        'type',
        'bio',
        'headshotUrl',
        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',
        'mediaUrl',
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

  async createBooking(createBookingDto: CreateBookingDto, userId: number) {
    const { venueId, entertainerId, ...bookingData } = createBookingDto;

    // Validate the venue refrence to the current User.
    const venue = await this.venueRepository.findOne({
      where: { id: venueId, user: { id: userId } },
    });

    if (!venue) {
      throw new UnauthorizedException({
        message: 'Access Denied',
        reason: "Cannot create booking for others' venue.",
      });
    }

    // Create the booking

    const newBooking = this.bookingRepository.create({
      ...bookingData,
      venue: { id: venueId },
      entertainer: { id: entertainerId },
    });

    // Save the booking
    if (!newBooking) {
      throw new Error('Failed to create booking');
    }

    // changes must be there
    const savedBooking = await this.bookingRepository.save(newBooking);
    const { createdAt, updatedAt, ...bookingDetails } = savedBooking;
    return { message: 'Booking created successfully', booking: bookingData };
  }
}

[
  'id',
  'name',
  'type',
  'bio',
  'headshotUrl',
  'performanceRole',
  'phone1',
  'phone2',
  'pricePerEvent',
  'mediaUrl',
  'vaccinated',
  'availability',
  'status',
  'socialLinks',
];
