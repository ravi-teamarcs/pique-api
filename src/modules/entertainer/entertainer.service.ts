import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Category } from './entities/categories.entity';

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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createEntertainerDto: CreateEntertainerDto, userId: number) {
    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingEntertainer) {
      throw new BadRequestException({
        message: 'Entertainer already exists for the user',
        status: false,
      });
    }
    // Create the entertainer
    const entertainer = this.entertainerRepository.create({
      ...createEntertainerDto,
      user: { id: userId },
    });

    const savedEntertainer = this.entertainerRepository.save(entertainer);
    return {
      message: 'Entertainer saved Successfully',
      status: true,
      entertainer,
    };
  }

  findAll(userId: number) {
    const entertainers = this.entertainerRepository.find({
      where: { user: { id: userId } },
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

    return {
      message: 'Entertainer Fetched Successfully',
      entertainers,
      status: true,
    };
  }

  async findOne(id: number, userId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
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
    if (!entertainer) {
      throw new NotFoundException({
        message: 'Entertainer not found',
        status: false,
      });
    }
    return {
      message: 'Entertainer fetched Successfully',
      entertainer,
      status: true,
    };
  }

  async update(
    id: number,
    updateEntertainerDto: UpdateEntertainerDto,
    userId: number,
  ) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
    });
    Object.assign(entertainer, updateEntertainerDto);
    await this.entertainerRepository.save(entertainer);
    return { message: 'Entertainer updated Successfully', status: true };
  }

  async remove(id: number, userId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
    });
    await this.entertainerRepository.remove(entertainer);
    return { message: 'Entertainer removed Sucessfully', status: true };
  }

  async findAllBooking(userId: number) {
    // Find entertainers belonging to the specified user
    try {
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
          'venue.name AS name',
          'venue.phone AS phone',
          'venue.amenities AS amenities',
          'venue.email AS email',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
        ])
        .getRawMany(); // Use getRawMany() since we are manually selecting fields

      return {
        message: 'Booking created Suceessfully',
        bookings,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  async getCategories() {
    const categories = await this.categoryRepository.find({
      where: { parentId: 0 },
      select: ['id', 'name'],
    });

    return {
      message: 'categories returned Successfully ',
      categories,
      status: true,
    };
  }
  async getSubCategories(catId: number) {
    const categories = await this.categoryRepository.find({
      where: { parentId: catId },
    });
    if (categories.length === 0) {
      return { message: 'Sub-categories not found', categories: null };
    }
    return {
      message: ' Sub-categories returned Successfully ',
      categories,
      status: true,
    };
  }
}
