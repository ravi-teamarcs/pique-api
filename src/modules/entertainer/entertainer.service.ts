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
import { Media } from '../media/entities/media.entity';
import { DashboardDto } from './dto/dashboard.dto';
import { Invoice } from '../invoice/entities/invoice.entity';

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
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
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

    const savedEntertainer = await this.entertainerRepository.save(entertainer);

    return {
      message: 'Entertainer saved Successfully',
      status: true,
      entertainer,
    };
  }

  async findAll(userId: number) {
    const entertainers = await this.entertainerRepository.find({
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
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Manual join since there's no relation
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['pending', 'confirmed'],
        }) // Add status filter

        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showDate As showDate',
          'booking.showTime As showTime',
          'booking.specialNotes  As specialNotes',
          'venue.name AS name',
          'venue.phone AS phone',

          'venue.email AS email',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
        ])
        .orderBy('booking.createdAt', 'DESC') // Corrected sorting
        .getRawMany(); // Use getRawMany() since we are manually selecting fields

      return {
        message: 'Booking created Suceessfully',
        bookings,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
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

  async getEventDetails(userId: number) {
    const events = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .where('booking.entertainerUserId = :userId', { userId })
      // .andWhere('booking.status = :status', { status: 'completed' })
      .select([
        'booking.id AS bookingId',
        'event.id AS eid',
        'event.title AS title',
        'event.location AS location',
        'event.status AS  status',
        'event.description AS description',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
      ])
      .getRawMany();

    return {
      message: 'Events returned Successfully',
      data: events,
      status: true,
    };
  }

  async getDashboardStatistics(userId: number, query: DashboardDto) {
    const { year, month } = query;
    try {
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month !== undefined ? month : now.getMonth() + 1; // JavaScript months are 0-indexed

      // Start & end of selected month
      const startDate = new Date(targetYear, targetMonth - 1, 1); // First day of month
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59); // Last day of month

      const counts = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect('COUNT(booking.id)', 'count')
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .groupBy('booking.status')
        .getRawMany();

      const total = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.total_with_tax), 0)', 'totalRevenue') // Sum all paid invoices
        .where('invoice.user_id = :userId', { userId })
        .andWhere('invoice.status = :paid', { paid: 'paid' }) // Only include paid invoices
        .andWhere('invoice.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        }) // Filter for current month
        .getRawOne();
      const { totalRevenue } = total;
      // Convert raw results to a structured response
      const response = {
        month: startDate.toLocaleString('default', { month: 'long' }),
        leads: Number(counts.find((b) => b.status === 'pending')?.count) || 0,
        acceptedBookings:
          Number(counts.find((b) => b.status === 'accepted')?.count) || 0,
        completedBookings:
          Number(counts.find((b) => b.status === 'completed')?.count) || 0,
        revenue: Number(totalRevenue),
      };

      return {
        message: 'Entertainer Dashboard returned Successfully',
        status: true,
        data: response,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
