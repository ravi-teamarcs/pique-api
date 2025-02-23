import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class EntertainerService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  async create(
    createEntertainerDto: CreateEntertainerDto,
    userId: number,
  ): Promise<Entertainer> {
    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingEntertainer) {
      throw new BadRequestException('Entertainer already exists for the user');
    }
    // Create the entertainer
    const entertainer = this.entertainerRepository.create({
      ...createEntertainerDto,
      user: { id: userId },
    });

    return this.entertainerRepository.save(entertainer);
  }

  findAll(userId: number): Promise<Entertainer[]> {
    return this.entertainerRepository.find({
      where: { user: { id: userId } },
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
  }

  async findOne(id: number, userId: number): Promise<Entertainer> {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
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
    if (!entertainer) {
      throw new NotFoundException('Entertainer not found');
    }
    return entertainer;
  }

  async update(
    id: number,
    updateEntertainerDto: UpdateEntertainerDto,
    userId: number,
  ): Promise<Entertainer> {
    const entertainer = await this.findOne(id, userId);
    Object.assign(entertainer, updateEntertainerDto);
    return this.entertainerRepository.save(entertainer);
  }

  async remove(id: number, userId: number): Promise<void> {
    const entertainer = await this.findOne(id, userId);
    await this.entertainerRepository.remove(entertainer);
  }
  async findAllBooking(userId: number): Promise<Booking[]> {
    // Find entertainers belonging to the specified user
    try {
      //     const entertainers = await this.entertainerRepository.find({
      //       where: { user: { id: userId } },
      //     });

      // Extract entertainer IDs
      // const entertainerIds = entertainers.map((entertainer) => entertainer.id);

      // Find bookings for these entertainers
      // const bookings = await this.bookingRepository.find({
      //   where: { entertainer: { id: In(entertainerIds) } },
      //   select: [
      //     'id',
      //     'status',
      //     'showTime',
      //     'isAccepted',
      //     'showDate',
      //     'specialNotes',
      //     'specificLocation',
      //   ],
      //   relations: ['venue'],
      // });
      // const bookings = await this.bookingRepository.find({
      //   where: { entertainerUser: { id: userId } },
      //   select: [
      //     'id',
      //     'status',
      //     'showTime',
      //     'isAccepted',
      //     'showDate',
      //     'specialNotes',
      //   ],
      // });
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(Venue, 'venue', 'venue.id = booking.venueId') // Manual join since there's no relation
        .where('booking.entertainerUserId = :userId', { userId })
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showDate As showDate',
          'booking.showTime As showTime',
          'booking.specialNotes  As specialNotes',
          // 'venue.id AS venue', // Ensure venue ID is included
          'venue.name AS name',
          'venue.phone AS phone',
          'venue.amenities AS amenities',
          'venue.email AS email',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
        ])
        .getRawMany(); // Use getRawMany() since we are manually selecting fields

      return bookings;
    } catch (error) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
