import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
import { Media } from '../media/entities/media.entity';

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
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
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
      select: [
        'id',
        'name',
        'phone',
        'email',
        'addressLine1',
        'addressLine2',
        'description',
        'city',
        'state',
        'zipCode',
        'country',
        'lat',
        'long',
        'amenities',
        'websiteUrl',
        'timings',
        'bookingPolicies',
      ],
    });
  }

  async findOneByUser(id: number, userId: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id, user: { id: userId } },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'addressLine1',
        'addressLine2',
        'description',
        'city',
        'state',
        'zipCode',
        'country',
        'lat',
        'long',
        'amenities',
        'websiteUrl',
        'timings',
        'bookingPolicies',
      ],
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async findByAvailabilityAndType(query: SearchEntertainerDto) {
    const { availability, type } = query;

    const res = await this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user')
      .where('entertainer.type = :type', { type })
      .andWhere('entertainer.availability = :availability', { availability })
      .select([
        'entertainer.id',
        'entertainer.name',
        'entertainer.type',
        'entertainer.bio',
        'entertainer.performanceRole',
        'entertainer.phone1',
        'entertainer.phone2',
        'entertainer.pricePerEvent',
        'entertainer.vaccinated',
        'entertainer.availability',
        'entertainer.status',
        'entertainer.socialLinks',
        'user.id',
      ])
      .getMany();

    const entertainers = await Promise.all(
      res.map(async (item) => {
        const media = await this.mediaRepository.find({
          where: { user: { id: item.user.id } }, // Corrected filtering
          select: ['url', 'name', 'type'],
        });

        console.log('Media returned', media);

        return { ...item, media };
      }),
    );

    return {
      message: 'Entertainers fetched Sucessfully',
      count: entertainers.length,
      entertainers,
    };
  }

  async findAllEntertainers() {
    const entertainers = await this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user')
      .where('entertainer.user.id =  user.id')
      .select([
        'entertainer.id',
        'entertainer.name',
        'entertainer.type',
        'entertainer.bio',
        'entertainer.performanceRole',
        'entertainer.phone1',
        'entertainer.phone2',
        'entertainer.pricePerEvent',
        'entertainer.vaccinated',
        'entertainer.availability',
        'entertainer.status',
        'entertainer.socialLinks',
        'user.id',
      ])

      .getMany();

    if (!entertainers) {
      throw new Error('No entertainer found');
    }

    return {
      message: 'Entertainer returned successfully',
      count: entertainers.length,
      entertainers,
    };
  }

  // To find Booking related to Venue user
  async findAllBooking(userId: number) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.entertainerUser', 'entertainerUser')
      .leftJoinAndSelect('entertainerUser.entertainer', 'entertainer')
      .where('booking.venueUser.id = :userId', { userId })
      .select([
        'booking.id',
        'booking.status',
        'booking.showDate',
        'booking.isAccepted',
        'booking.specialNotes',
        'entertainerUser.id',
        'entertainer.id',
        'entertainer.name',
        'entertainer.type',
        'entertainer.bio',
        'entertainer.phone1',
        'entertainer.phone2',
        'entertainer.performanceRole',
        'entertainer.availability',
        'entertainer.pricePerEvent',
        'entertainer.socialLinks',
        'entertainer.vaccinated',
        'entertainer.status',
      ])
      .getMany();

    if (!bookings) {
      throw new Error('No bookings found');
    }

    return {
      message: 'Bookings returned successfully',
      count: bookings.length,
      bookings,
    };
  }

  async handleUpdateVenueDetails(
    updateVenueDto: UpdateVenueDto,
    userId: number,
  ) {
    const { venueId, ...details } = updateVenueDto;
    const venue = await this.venueRepository.findOne({
      where: { id: venueId, user: { id: userId } },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const updateVenue = await this.venueRepository.update(
      { id: venue.id },
      details,
    );
    if (updateVenue.affected) {
      return { message: 'Venue updated successfully', venue };
    } else {
      throw new InternalServerErrorException('Failed to update venue');
    }
  }

  async handleRemoveVenue(id: number, userId: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { id: id, user: { id: userId } },
      });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }

      const res = await this.venueRepository.delete({ id: venue.id });

      if (res.affected) {
        return { message: 'Venue deleted successfully' };
      }
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete venue');
    }
  }
}
