import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
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
import { ConfigService } from '@nestjs/config';
import { MediaService } from '../media/media.service';
import { UploadedFile } from 'src/common/types/media.type';
import { UpcomingEventDto } from './dto/upcoming-event.dto';
import { EventsByMonthDto } from './dto/get-events-bymonth.dto';

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
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
  ) {}

  // Old Method
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

    await this.entertainerRepository.save(entertainer);

    return {
      message: 'Entertainer saved Successfully',
      status: true,
      entertainer,
    };
  }

  // New Method for  Create Entertainer
  async createEntertainerWithMedia(
    dto: CreateEntertainerDto,
    userId: number,
    uploadedFiles: UploadedFile[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingEntertainer) {
      throw new BadRequestException({
        message: 'Entertainer already exists for the user',
        status: false,
      });
    }

    try {
      const entertainer = this.entertainerRepository.create({
        ...dto,
        user: { id: userId },
      });

      await this.entertainerRepository.save(entertainer);

      // Step 2: Upload media (calls external service)
      const mediaUploadResult = await this.mediaService.handleMediaUpload(
        userId,
        uploadedFiles,
      );

      // Step 3: Commit transaction if everything is successful
      await queryRunner.commitTransaction();

      return {
        message: 'Entertainer saved Successfully',
        status: true,
        entertainer,
      };
    } catch (error) {
      // Step 4: Rollback transaction if anything fails
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async findEntertainer(userId: number) {
    console.log('userId', userId);
    const URL = this.config.get<string>('DEFAULT_MEDIA');

    try {
      const entertainer = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category ')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category ',
        )
        .where('entertainer.userId = :userId', { userId })
        .select([
          'user.id AS uid',
          'entertainer.name AS stageName',
          'user.name AS name',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'cat.name AS category',
          'subcat.name AS specific_category',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.availability AS availability',
          'entertainer.vaccinated AS vaccinated',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM media m WHERE m.userId = user.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();
      console.log('entertainer', entertainer);
      return {
        message: 'Entertainer Fetched Successfully',
        data: entertainer ? entertainer : {},
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
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
    try {
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Manual join since there's no
        .leftJoin('event', 'event', 'event.id = booking.eventId') // Manual join since there's no
        .leftJoin('cities', 'city', 'city.id = venue.city') // Manual join since there's no
        .leftJoin('states', 'state', 'state.id = venue.state') // Manual join since there's no
        .leftJoin('countries', 'country', 'country.id = venue.country') // Manual join since there's no
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['pending', 'confirmed'],
        })
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showDate As showDate',
          'booking.showTime As showTime',
          'booking.specialNotes  As specialNotes',
          'booking.performanceRole AS performanceRole',
          'venue.name AS name',
          'venue.phone AS phone',
          'venue.email AS email',
          'event.id AS event_id',
          'event.title AS event_title',
          'event.location AS event_location',
          'event.description AS event_description',
          'event.startTime AS event_startTime',
          'event.endTime AS event_endTime',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
          'city.name AS city_name',
          'country.name AS country_name',
          'state.name AS state_name',
        ])
        .orderBy('booking.createdAt', 'DESC') // Corrected sorting
        .getRawMany(); // Use getRawMany() since we are manually selecting fields

      return {
        message: 'Booking created Suceessfully',
        bookings,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
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
    const URL = `https://digidemo.in/api/uploads/2025/031741334326736-839589383.png`;

    const events = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('media', 'media', 'media.eventId = booking.eventId')
      .where('booking.entertainerUserId = :userId', { userId })
      .andWhere('booking.status = :status', { status: 'confirmed' })
      .select([
        'booking.id AS bookingId',
        'event.id AS id',
        'event.title AS title',
        'event.location AS location',
        'event.status AS status',
        'event.description AS description',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.status AS status',
        'event.recurring AS recurring',
        `COALESCE(CONCAT(:baseUrl, media.url), :defaultMediaUrl) AS image_url`,
      ])
      .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
      .setParameter('defaultMediaUrl', URL)
      .getRawMany();

    return {
      message: 'Events returned Successfully',
      data: events,
      status: true,
    };
  }

  async getDashboardStatistics(userId: number, query: DashboardDto) {
    const { year = null, month = null } = query;
    try {
      const currentDate = new Date();

      const currentYear = year ?? currentDate.getFullYear();
      const currentMonth = month ?? currentDate.getMonth();

      // Date Ranges for Current & Previous Month
      const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const prevStartDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0);
      const prevEndDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // Revenue Calculation Here
      const revenueData = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select([
          'SUM(CASE WHEN invoice.payment_date BETWEEN :startDate AND :endDate THEN invoice.total_with_tax ELSE 0 END) AS currentRevenue',
          'SUM(CASE WHEN invoice.payment_date BETWEEN :prevStartDate AND :prevEndDate THEN invoice.total_with_tax ELSE 0 END) AS previousRevenue',
        ])
        .where('invoice.user_id = :userId', { userId })
        .andWhere('invoice.status = :paid', { paid: 'paid' })
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawOne();

      const currentTotalRevenue = Number(revenueData.currentRevenue) || 0;
      const previousTotalRevenue = Number(revenueData.previousRevenue) || 0;

      // Fetch Booking Stats (By Status & Total Count)
      const bookingData = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect(
          `COUNT(CASE WHEN booking.createdAt BETWEEN :startDate AND :endDate THEN booking.id ELSE NULL END)`,
          'currentCount',
        )
        .addSelect(
          `COUNT(CASE WHEN booking.createdAt BETWEEN :prevStartDate AND :prevEndDate THEN booking.id ELSE NULL END)`,
          'previousCount',
        )
        .where('booking.entertainerUserId = :userId', { userId })
        .groupBy('booking.status')
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawMany();

      // Fetch Total Bookings
      const totalBookingsData = await this.bookingRepository
        .createQueryBuilder('booking')
        .select([
          `COUNT(CASE WHEN booking.createdAt BETWEEN :startDate AND :endDate THEN booking.id ELSE NULL END) AS currentTotalBookings`,
          `COUNT(CASE WHEN booking.createdAt BETWEEN :prevStartDate AND :prevEndDate THEN booking.id ELSE NULL END) AS previousTotalBookings`,
        ])
        .where('booking.entertainerUserId = :userId', { userId })
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawOne();

      const currentTotalBookings =
        Number(totalBookingsData.currentTotalBookings) || 0;
      const previousTotalBookings =
        Number(totalBookingsData.previousTotalBookings) || 0;

      // Convert bookings to structured format
      const bookingStats = {
        pending: { current: 0, previous: 0 },
        accepted: { current: 0, previous: 0 },
        completed: { current: 0, previous: 0 },
      };

      bookingData.forEach((item) => {
        const status = item.status;
        bookingStats[status] = {
          current: Number(item.currentCount) || 0,
          previous: Number(item.previousCount) || 0,
        };
      });

      // Calculate Percentage Change (Handles Edge Cases)
      function calculateChange(current: number, previous: number) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      }

      const revenueChange = calculateChange(
        currentTotalRevenue,
        previousTotalRevenue,
      );
      const totalBookingsChange = calculateChange(
        currentTotalBookings,
        previousTotalBookings,
      );
      const pendingChange = calculateChange(
        bookingStats.pending.current,
        bookingStats.pending.previous,
      );
      const acceptedChange = calculateChange(
        bookingStats.accepted.current,
        bookingStats.accepted.previous,
      );
      const completedChange = calculateChange(
        bookingStats.completed.current,
        bookingStats.completed.previous,
      );

      // ✅ Final API Response
      const res = {
        revenue: {
          currentMonthRevenue: currentTotalRevenue,
          previousMonthRevenue: previousTotalRevenue,
          revenueChangePercentage: revenueChange,
          revenueTrend:
            revenueChange > 0
              ? 'increase'
              : revenueChange < 0
                ? 'decrease'
                : 'same',
        },
        bookings: {
          total: {
            currentMonthBookings: currentTotalBookings,
            previousMonthBookings: previousTotalBookings,
            bookingChangePercentage: totalBookingsChange,
            bookingTrend:
              totalBookingsChange > 0
                ? 'increase'
                : totalBookingsChange < 0
                  ? 'decrease'
                  : 'same',
          },
          pending: {
            currentMonthBookings: bookingStats.pending.current,
            previousMonthBookings: bookingStats.pending.previous,
            bookingChangePercentage: pendingChange,
            bookingTrend:
              pendingChange > 0
                ? 'increase'
                : pendingChange < 0
                  ? 'decrease'
                  : 'same',
          },
          accepted: {
            currentMonthBookings: bookingStats.accepted.current,
            previousMonthBookings: bookingStats.accepted.previous,
            bookingChangePercentage: acceptedChange,
            bookingTrend:
              acceptedChange > 0
                ? 'increase'
                : acceptedChange < 0
                  ? 'decrease'
                  : 'same',
          },
          completed: {
            currentMonthBookings: bookingStats.completed.current,
            previousMonthBookings: bookingStats.completed.previous,
            bookingChangePercentage: completedChange,
            bookingTrend:
              completedChange > 0
                ? 'increase'
                : completedChange < 0
                  ? 'decrease'
                  : 'same',
          },
        },
      };

      return {
        message: 'Entertainer Dashboard returned Successfully',
        status: true,
        data: res,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // async addAvailability(
  //   entertainerId: number,
  //   date: string,
  //   startTime: string,
  //   endTime: string,
  // ) {
  //   try {
  //     const overlaps = await this.availabilityRepo.find({
  //       where: {
  //         entertainer_id: entertainerId,
  //         date,
  //         start_time: LessThan(endTime),
  //         end_time: MoreThan(startTime),
  //       },
  //     });

  //     if (overlaps.length > 0) {
  //       throw new BadRequestException(
  //         'Time slot overlaps with existing availability',
  //       );
  //     }

  //     const availability = this.availabilityRepo.create({
  //       entertainer_id: entertainerId,
  //       date,
  //       start_time: startTime,
  //       end_time: endTime,
  //     });

  //     await this.availabilityRepo.save(availability);

  //     return { message: 'Availability Added successfully', status: true };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: 'Error while adding availability',
  //       error: error.message,
  //       status: false,
  //     });
  //   }
  // }

  // Calendar  so that  it can be displayed on ui
  // async getCalendar(entertainerId: number) {
  //   try {
  //     const availabilities = await this.availabilityRepo.find({
  //       where: { entertainer_id: entertainerId },
  //     });

  //     const bookings = await this.bookingRepo.find({
  //       where: { entertainer_id: entertainerId, status: 'confirmed' },
  //     });

  //     const calendarData = {
  //       availability: availabilities,
  //       bookings: bookings,
  //     };
  //     return {
  //       message: 'Calendar Data fetched successfully',
  //       data: calendarData,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: 'Error while fetching calendar',
  //       error: error.message,
  //       status: false,
  //     });
  //   }
  // }

  // async bookSlot(venueId, entertainerId, date, startTime, endTime) {
  //   // Check if the requested time is fully inside one available slot
  //   try {
  //     const slot = await this.availabilityRepo.findOne({
  //       where: {
  //         entertainer_id: entertainerId,
  //         date,
  //         start_time: LessThanOrEqual(startTime),
  //         end_time: MoreThanOrEqual(endTime),
  //       },
  //     });

  //     if (!slot)
  //       throw new BadRequestException({
  //         message: 'Requested time is not available',
  //         status: false,
  //       });

  //     // Check for overlap with other bookings
  //     const overlap = await this.bookingRepo.findOne({
  //       where: {
  //         entertainer_id: entertainerId,
  //         date,
  //         status: 'confirmed',
  //         start_time: LessThan(endTime),
  //         end_time: MoreThan(startTime),
  //       },
  //     });

  //     if (overlap)
  //       throw new BadRequestException({
  //         message: 'Entertainer already booked at this time',
  //         status: false,
  //       });

  //     const booking = this.bookingRepo.create({
  //       venue_id: venueId,
  //       entertainer_id: entertainerId,
  //       date,
  //       start_time: startTime,
  //       end_time: endTime,
  //       status: 'confirmed',
  //     });

  //     return await this.bookingRepo.save(booking);
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: 'Error while booking slot',
  //       error: error.message,
  //       status: false,
  //     });
  //   }
  // }

  async getUpcomingEvent(userId: number, query: UpcomingEventDto) {
    const { page = 1, pageSize = 10 } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    try {
      const URL =
        'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';
      const events = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('event', 'event', 'event.id = booking.eventId') // simple join
        .leftJoin(
          'venue',
          'venue',
          'venue.id = booking.venueId AND event.startTime > :now',
          { now: new Date() },
        )
        .leftJoin('media', 'media', 'media.eventId = event.id')
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.status = :status', { status: 'confirmed' })

        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.userId AS userId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine2 AS venue_addressLine2',
          `CASE WHEN media.url IS NOT NULL THEN CONCAT(:baseUrl, media.url) ELSE :defaultMediaUrl END AS image_url`,
        ])
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .orderBy('event.startTime', 'ASC');

      const totalCount = await events.getCount();

      const results = await events
        .skip(Number(skip))
        .take(Number(pageSize))
        .getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: true,
      });
    }
  }

  async getEventDetailsByMonth(userId: number, query: EventsByMonthDto) {
    const {
      date = '', // e.g., '2025-04'
      page = 1,
      pageSize = 10,
    } = query;

    // If date is not provided, use current year and month
    const current = new Date();
    const year = date ? Number(date.split('-')[0]) : current.getFullYear();
    const month = date ? Number(date.split('-')[1]) : current.getMonth() + 1;

    const skip = (page - 1) * pageSize;

    try {
      const qb = this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoin('event', 'event', 'event.id = booking.eventId')
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('YEAR(event.startTime) = :year', { year })
        .andWhere('MONTH(event.startTime) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.userId AS userId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
        ])
        .orderBy('event.startTime', 'ASC');

      const totalCount = await qb.getCount();
      const results = await qb.skip(skip).take(pageSize).getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
