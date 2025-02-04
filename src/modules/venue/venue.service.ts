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

  async findAllEntertainers(query: SearchEntertainerDto) {
    const {
      availability = '',
      category = '',
      search = '',
      page = 1,
      pageSize = 10,
    } = query;

    // Number of records per page
    const skip = (Number(page) - 1) * Number(pageSize); // Calculate offset

    const res = this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user')
      .select([
        'entertainer.id',
        'entertainer.name',
        'entertainer.category',
        'entertainer.specific_category',
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
        'user.email', // Example: More control over user relation
      ]);

    if (availability) {
      res.andWhere('entertainer.availability = :availability', {
        availability,
      });
    }

    // Apply `type` filter if provided
    if (category) {
      res.andWhere('entertainer.category = :category', { category });
    }

    // Apply search filter if provided (searches across multiple fields)
    if (search.trim() !== '') {
      res.andWhere(
        `(entertainer.name LIKE :search OR 
            entertainer.category LIKE :search OR 
            entertainer.bio LIKE :search OR 
            entertainer.performanceRole LIKE :search OR 
            entertainer.phone1 LIKE :search OR 
            entertainer.phone2 LIKE :search OR 
            entertainer.status LIKE :search OR 
            user.email LIKE :search)`, // Example: Searching user email too
        { search: `%${search}%` },
      );
    }

    // Get total count before pagination
    const totalCount = await res.getCount();

    // // Apply pagination
    const results = await res.skip(skip).take(Number(pageSize)).getMany();

    const entertainers = await Promise.all(
      results.map(async (item) => {
        const media = await this.mediaRepository.find({
          where: { user: { id: item.user.id } }, // Corrected filtering
          select: ['url', 'name', 'type'],
        });
        return {
          ...item,
          media,
        };
      }),
    );

    return {
      message: 'Entertainers fetched Sucessfully',
      totalCount,
      page,
      pageSize, // Records per Page
      totalPages: Math.ceil(totalCount / Number(pageSize)),
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

  async findEntertainerDetails(userId: number) {
    console.log('User Id ', userId, typeof userId);
    const details = await this.entertainerRepository.findOne({
      where: { user: { id: Number(userId) } },
      select: [
        'id',
        'name',
        'category',
        'specific_category',
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

    if (!details) throw new NotFoundException('Entertainer not Found');

    const media = await this.mediaRepository.find({
      where: { user: { id: userId } }, // Corrected filtering
      select: ['url', 'name', 'type'],
    });

    return {
      message: 'Entertainer Details returned Successfully ',
      entertainer: { ...details, media: media },
    };
  }
}
