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
import {
  // CreateEntertainerDto,
  Step1Dto,
  Step2Dto,
  Step3Dto,
  Step4Dto,
  Step5Dto,
  Step6Dto,
  Step7Dto,
  Step8Dto,
  Step9Dto,
} from './dto/create-entertainer.dto';
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
import { BookingQueryDto } from './dto/booking-query-dto';
import { VenueEvent } from '../event/entities/event.entity';

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
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
  ) {}

  // New Flow // Step1
  async saveBasicDetails(dto: Step1Dto, userId: number) {
    const { stageName, step, ...rest } = dto;
    try {
      const entertainer = this.entertainerRepository.create({
        name: stageName,
        user: { id: userId },
        profileStep: 1,
        ...rest,
      });
      await this.entertainerRepository.save(entertainer);
      return {
        message: 'Entertainer primary details saved successfully',
        status: true,
        step: 1,
        nextStep: Number('02'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveBio(dto: Step2Dto, userId: number) {
    const { bio } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 2, bio },
      );
      return {
        message: 'Bio saved Successfully',
        status: true,
        step: 2,
        nextStep: Number('03'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async vaccinationStatus(dto: Step3Dto, userId: number) {
    const { vaccinated } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 3, vaccinated },
      );
      return {
        message: 'Vaccination status saved Successfully',
        status: true,
        step: 3,
        nextStep: Number('04'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async contactDetails(dto: Step4Dto, userId: number) {
    const { contactPerson, contactNumber } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }

    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        {
          profileStep: 4,
          contact_person: contactPerson,
          contact_number: contactNumber,
        },
      );
      return {
        message: 'Contact Details saved Successfully',
        status: true,
        step: 4,
        nextStep: Number('05'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async socialLinks(dto: Step5Dto, userId: number) {
    const { socialLinks } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 5, socialLinks },
      );
      return {
        message: 'Social Links  saved Successfully',
        status: true,
        step: 5,
        nextStep: Number('06'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveCategory(dto: Step6Dto, userId: number) {
    const { category } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 6, category },
      );
      return {
        message: 'Category saved Successfully',
        status: true,
        step: 6,
        nextStep: Number('07'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveSpecificCategory(dto: Step7Dto, userId: number) {
    const { specific_category } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 7, specific_category },
      );
      return {
        message: 'Specific Category saved Successfully',
        status: true,
        step: 7,
        nextStep: Number('08'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async performanceRole(dto: Step8Dto, userId: number) {
    const { performanceRole } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 8, performanceRole },
      );
      return {
        message: 'Performance role saved Successfully',
        status: true,
        step: 8,
        nextStep: Number('09'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveServices(dto: Step9Dto, userId: number) {
    const { services } = dto;
    console.log(services);
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 9, services },
      );
      return {
        message: 'Services  saved Successfully',
        status: true,
        step: 9,
        nextStep: Number('10'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async uploadMedia(userId: number, uploadedFiles: UploadedFile[]) {
    const ent = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!ent) {
      throw new BadRequestException({
        message: 'Venue Not Found',
        status: false,
      });
    }
    try {
      const { data } = await this.mediaService.handleMediaUpload(
        ent.id,
        uploadedFiles,
        { eventId: null },
      );

      return {
        message: 'Media uploaded Successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async saveEntertainerDetails(userId: number) {
    try {
      const ent = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      await this.entertainerRepository.update(
        { id: ent.id },
        { isProfileComplete: true, profileStep: 10 },
      );

      return {
        message: 'Entertainer  is created sucessfully with media.',
        step: 10,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findEntertainer(userId: number) {
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
          'cat.name AS category_name',
          'subcat.name AS specific_category_name',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.city AS city',
          'entertainer.state AS state',
          'entertainer.country AS country',
          'entertainer.zipCode AS zipCode',
          'entertainer.address AS address',
          'entertainer.services AS services',
          'entertainer.dob AS dob',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'entertainer.category AS category',
          'entertainer.specific_category AS specific_category',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM media m WHERE m.userId = user.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

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

  // async update(
  //   dto: UpdateEntertainerDto,
  //   userId: number,
  //   uploadedFiles: UploadedFile[],
  // ) {
  //   const { contactNumber, contactPerson, ...rest } = dto;

  //   const queryRunner = this.dataSource.createQueryRunner(dto:Step5Dto ,userId:number);
  //   await queryRunner.connect(dto:Step5Dto ,userId:number);
  //   await queryRunner.startTransaction(dto:Step5Dto ,userId:number);

  //   const existingEntertainer = await this.entertainerRepository.findOne({
  //     where: { user: { id: userId } },
  //   });

  //   if (!existingEntertainer) {
  //     throw new BadRequestException({
  //       message: 'Entertainer not Found',
  //       status: false,
  //     });
  //   }

  //   const updatePayload: any = {
  //     ...rest,
  //   };

  //   if (contactNumber !== undefined) {
  //     updatePayload.contact_number = contactNumber;
  //   }

  //   if (contactPerson !== undefined) {
  //     updatePayload.contact_person = contactPerson;
  //   }

  //   try {
  //     // Step 1: Update entertainer
  //     await queryRunner.manager.update(
  //       this.entertainerRepository.target,
  //       { user: { id: userId } },
  //       updatePayload,
  //     );

  //     // Step 2: If media is present, upload it — or else skip
  //     if (uploadedFiles && uploadedFiles.length > 0) {
  //       const mediaUploadResult = await this.mediaService.handleMediaUpload(
  //         userId,
  //         uploadedFiles,
  //         { eventId: null },
  //       );

  //       // You can add validation here to check if upload failed, if needed
  //     }

  //     // Step 3: Commit transaction
  //     await queryRunner.commitTransaction(dto:Step5Dto ,userId:number);

  //     return {
  //       message: 'Entertainer updated successfully',
  //       status: true,
  //     };
  //   } catch (error) {
  //     await queryRunner.rollbackTransaction(dto:Step5Dto ,userId:number);
  //     throw new InternalServerErrorException({
  //       error: error.message,
  //       status: false,
  //     });
  //   } finally {
  //     await queryRunner.release(dto:Step5Dto ,userId:number);
  //   }
  // }

  async remove(id: number, userId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
    });
    await this.entertainerRepository.remove(entertainer);
    return { message: 'Entertainer removed Sucessfully', status: true };
  }

  async findAllBooking(userId: number, query: BookingQueryDto) {
    const { page = 1, pageSize = 10, search = '', status = [] } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    try {
      const bookings = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Manual join since there's no
        .leftJoin('event', 'event', 'event.id = booking.eventId') // Manual join since there's no
        .leftJoin('cities', 'city', 'city.id = venue.city') // Manual join since there's no
        .leftJoin('states', 'state', 'state.id = venue.state') // Manual join since there's no
        .leftJoin('countries', 'country', 'country.id = venue.country') // Manual join since there's no
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [
            'pending',
            'confirmed',
            'cancelled',
            'completed',
            'accepted',
            'rejected',
          ],
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
        .orderBy('booking.createdAt', 'DESC'); // Corrected sorting

      if (search && search.trim()) {
        bookings.andWhere(
          'LOWER(event.title) LIKE :search OR  LOWER(venue.name) LIKE :search',
          {
            search: `%${search.toLowerCase()}%`,
          },
        );
      }

      if (status && status.length > 0) {
        bookings.andWhere('booking.status IN (:...statuses)', {
          statuses: status,
        });
      }

      const totalCount = await bookings.getCount();

      const results = await bookings
        .skip(Number(skip))
        .take(Number(pageSize))
        .getRawMany();

      return {
        message: 'Booking created Suceessfully',
        bookings: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }

  async findPendingBookings(userId: number) {
    try {
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('countries', 'country', 'country.id = venue.country')
        .where('booking.entertainerUserId = :userId', { userId })
        .andWhere('booking.status = :status', { status: 'pending' })
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showDate AS showDate',
          'booking.showTime AS showTime',
          'booking.specialNotes AS specialNotes',
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
        .orderBy('booking.createdAt', 'DESC')
        .getRawMany();

      return {
        message: 'Pending bookings fetched successfully',
        bookings,
        count: bookings.length,
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

  async getUpcomingEvent(userId: number, query: UpcomingEventDto) {
    const { page = 1, pageSize = 10, status = [], search = '' } = query;
    console.log('Status', status, 'Search', search);
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

      if (search && search.trim()) {
        events.andWhere('LOWER(event.title) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (status && status.length > 0) {
        events.andWhere('event.status IN (:...eventStatuses)', {
          eventStatuses: status,
        });
      }

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
      status = '',
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

      if (status) {
        qb.andWhere('event.status=:status', { status });
      }

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

  async getEventDetailsById(userId: number, id: number) {
    try {
      const eventDetails = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .where('event.id = :id', { id })
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
          'venue.name AS name',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
        ])
        .getRawOne();

      return {
        message: 'Event Details returned successfully',
        status: true,
        data: eventDetails,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: true,
      });
    }
  }
}
