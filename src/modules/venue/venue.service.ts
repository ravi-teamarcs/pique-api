import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { SearchEntertainerDto } from './dto/serach-entertainer.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { UpdateVenueDto, UpdateVenueRequest } from './dto/update-venue.dto';
import { User } from '../users/entities/users.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Media } from '../media/entities/media.entity';
import { Category } from '../entertainer/entities/categories.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { VenueLocationDto } from './dto/add-location.dto';
import { Data } from './dto/search-filter.dto';
import { instanceToPlain } from 'class-transformer';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistDto } from './dto/wishlist.dto';
import { ConfigService } from '@nestjs/config';
import { UploadedFile } from 'src/common/types/media.type';
import { MediaService } from '../media/media.service';
import { UnavailableDate } from '../entertainer/entities/unavailable.entity';
import { WeeklyAvailability } from '../entertainer/entities/weekly-availability.entity';
import { AddressDto } from './dto/address.dto';
import { BookingQueryDto } from './dto/get-venue-booking.dto';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { NeighbourhoodDto } from './dto/neighbourhood.dto';
import { UpdatePrimaryInfoDto } from './dto/update-primary-info.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateNeighbourhoodDto } from './dto/create-neighbourhood.dto';
import { UpdateNeighbourhoodDto } from './dto/update-neighbourhood.dto';
import { EventsByMonthDto } from '../entertainer/dto/get-events-bymonth.dto';

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
    @InjectRepository(Category)
    private readonly catRepository: Repository<Category>,
    @InjectRepository(Wishlist)
    private readonly wishRepository: Repository<Wishlist>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,

    private readonly config: ConfigService,
    private readonly mediaService: MediaService,
    private readonly dataSource: DataSource,
  ) {}

  // New Flow   Venue Creation   Step:1
  async createVenue(userId: number, dto) {
    const existing = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existing?.isProfileComplete) {
      throw new BadRequestException({
        message: 'You already have a completed venue profile.',
        status: false,
      });
    } else if (
      existing &&
      (existing.profileStep === 1 || existing.profileStep > 1)
    ) {
      throw new BadRequestException({
        message: 'Please complete your venue profile.',
        status: false,
      });
    }

    const venue = this.venueRepository.create({
      ...dto,
      user: { id: userId },
      profileStep: 1,
    });
    const savedVenue = await this.venueRepository.save(venue);
    return {
      message: 'Primary Details saved successfully',
      step: 1,
      nexStep: Number('02'),
      data: savedVenue,
      status: true,
    };
  }

  // Step :2

  async updateVenueAddress(userId: number, dto: AddressDto) {
    try {
      const venue = await this.venueRepository.findOneOrFail({
        where: {
          user: { id: userId },
          isProfileComplete: false,
          profileStep: 1,
        },
      });

      // Assign address fields
      Object.assign(venue, dto);

      // Move to next step
      venue.profileStep = 2;

      await this.venueRepository.save(venue);

      return {
        message: 'Address updated successfully. Proceed to media upload.',
        step: 2,
        nextStep: Number('03'),
        status: true,
        data: venue, // already updated
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async createNeighbourhood(userId: number, dto: NeighbourhoodDto) {
    const venue = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    try {
      // const neighbourhood = this.neighbourRepository.create({
      //   ...dto,
      //   venueId: venue.id,
      // });
      // await this.neighbourRepository.save(neighbourhood);
      // update other data
      await this.venueRepository.update(
        { id: venue.id },
        { ...dto, isProfileComplete: false, profileStep: 3 },
      );

      return {
        message: 'Contact details  saved Successfully',
        data: dto,
        step: 3,
        nextStep: Number('04'),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // step 4 (Final Step include Media upload)
  async uploadVenueMedia(userId: number, uploadedFiles: UploadedFile[]) {
    try {
      const venue = await this.venueRepository.findOneOrFail({
        where: { user: { id: userId }, isProfileComplete: false },
      });

      if (venue.profileStep !== 3) {
        throw new BadRequestException({
          message: 'You must complete step 3 before proceeding.',
          status: true,
        });
      }

      const { data } = await this.mediaService.handleMediaUpload(
        venue.id,
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

  async saveVenueDetails(userId: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });

      await this.venueRepository.update(
        { id: venue.id },
        { isProfileComplete: true, profileStep: 4 },
      );

      return {
        message: 'Venue is created sucessfully with media.',
        step: 4,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // Update Logic

  async updatePrimaryDetails(userId: number, dto: UpdatePrimaryInfoDto) {
    const venue = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    try {
      await this.venueRepository.update({ id: venue.id }, dto);
      const updatedVenue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });
      return {
        message: 'Details updates sucessfully',
        data: updatedVenue,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updateSecondaryDetails(userId: number, dto: UpdateAddressDto) {
    const venue = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    try {
      await this.venueRepository.update({ id: venue.id }, dto);
      const updatedVenue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });
      return {
        message: 'Details updates sucessfully',
        data: updatedVenue,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateNeighbourhood(userId: number, dto: UpdateNeighbourhoodDto) {
    const venue = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    try {
      // const neighbourhood = this.neighbourRepository.create({
      //   ...dto,
      //   venueId: venue.id,
      // });
      // await this.neighbourRepository.save(neighbourhood);
      // update other data
      await this.venueRepository.update({ id: venue.id }, { ...dto });

      return {
        message: 'Contact details updated Successfully',
        data: dto,

        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findAllByUser(userId: number, venueId: number) {
    const venueDetails = await this.venueRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.user', 'user')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS media_user_id', // expose user_id
              `JSON_ARRAYAGG(
              JSON_OBJECT(
                "url", CONCAT(:serverUri, media.url),
                "type", media.type
              )
            ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media', // alias for the subquery
        'media.media_user_id = venue.id', // now using the alias correctly
      )
      .select([
        'venue.id AS id',
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.description AS description',
        'venue.city AS city_code',
        'venue.state AS state_code',
        'venue.country AS country_code',
        'venue.contactPerson AS contactPerson',
        'venue.contactNumber AS contactNumber',
        'venue.zipCode AS zipCode',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'COALESCE(media.mediaDetails, "[]") AS media',
      ])

      .where('venue.id=:venueId', { venueId })
      .setParameter('serverUri', this.config.get<string>('BASE_URL'))
      .getRawOne();

    const neighbourhood = await this.neighbourRepository.find({
      where: { venueId },
    });
    const { media, ...rest } = venueDetails;
    const response = {
      ...rest,
      media: media ? JSON.parse(media) : null,
      neighbourhoods: neighbourhood,
    };

    return {
      message: 'Venue Details fetched Successfully',
      venue: response,
      status: true,
    };
  }

  async findVenueById(id: number) {
    const venue = await this.venueRepository.findOne({ where: { id } });
    return { message: 'Venue fetched successfully', data: venue, status: true };
  }

  // async findAllEntertainers(query: SearchEntertainerDto, userId: number) {
  //   const {
  //     category = [],
  //     sub_category = null,
  //     page = 1,
  //     pageSize = 10,
  //     city = null,
  //     date = '',
  //     startDate,
  //     endDate,
  //   } = query;

  //   // Pagination
  //   const skip = (Number(page) - 1) * Number(pageSize);
  //   const DEFAULT_MEDIA_URL =
  //     'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';

  //   try {
  //     const res = this.entertainerRepository
  //       .createQueryBuilder('entertainer')
  //       .leftJoin('cities', 'city', 'city.id = entertainer.city') // Join on normal column
  //       .leftJoin('states', 'state', 'state.id = entertainer.state') // Join on normal column
  //       .leftJoin('countries', 'country', 'country.id = entertainer.country') // Join on normal column
  //       .leftJoin(
  //         'categories',
  //         'category',
  //         'category.id = entertainer.category',
  //       ) // Join on normal column
  //       .leftJoin(
  //         'categories',
  //         'subcat',
  //         'entertainer.specific_category = subcat.id',
  //       ) // Join on normal column (specific_category)
  //       .addSelect((qb) => {
  //         return qb
  //           .select('1')
  //           .from('wishlist', 'w')
  //           .where('w.ent_id = entertainer.id')
  //           .andWhere('w.user_id = :userId')
  //           .limit(1);
  //       }, 'isWishlisted')
  //       // Join on normal column
  //       .leftJoin(
  //         (qb) =>
  //           qb
  //             .select([
  //               'entertainer.id AS entertainer_id',
  //               `
  //           COALESCE(
  //             MAX(CASE WHEN media.type = 'headshot' THEN CONCAT(:serverUri, media.url) END),
  //             :defaultMediaUrl
  //           ) AS media_url
  //           `,
  //             ])
  //             .from('entertainers', 'entertainer')
  //             .leftJoin('media', 'media', 'media.user_id = entertainer.id') // Join on normal column
  //             .groupBy('entertainer.id'),
  //         'media',
  //         'media.entertainer_id = entertainer.id', // Join condition on normal column
  //       )
  //       .select([
  //         'entertainer.id AS eid',
  //         'entertainer.name AS name',
  //         'entertainer.entertainer_name AS entertainer_name',
  //         'entertainer.category AS category',
  //         'entertainer.specific_category AS specific_category',
  //         'entertainer.performanceRole AS performanceRole',
  //         'entertainer.pricePerEvent AS pricePerEvent',
  //         'entertainer.vaccinated AS vaccinated',
  //         'entertainer.status AS status',
  //         'entertainer.bio AS bio',
  //         'city.name AS city',
  //         'state.name AS state',
  //         'country.name AS country',
  //         'category.name AS category_name',
  //         'subcat.name AS specific_category_name',
  //         'media.media_url AS mediaUrl',
  //         `CASE WHEN wish.ent_id IS NOT NULL THEN 1 ELSE 0 END AS isWishlisted`,
  //         'wish.name AS record',
  //       ])
  //       .where("entertainer.status = 'active'")
  //       .setParameter('serverUri', this.config.get<string>('BASE_URL'))
  //       .setParameter('defaultMediaUrl', DEFAULT_MEDIA_URL)
  //       .setParameter('userId', userId);

  //     // Apply filters if provided (category, sub_category, city, etc.)
  //     if (category !== null && category.length > 0) {
  //       res.andWhere('entertainer.category IN (:...category)', { category });
  //     }

  //     if (sub_category) {
  //       res.andWhere('entertainer.specific_category = :sub_category', {
  //         sub_category,
  //       });
  //     }

  //     if (city) {
  //       res.andWhere('entertainer.city = :city', { city });
  //     }

  //     if (date) {
  //       res.andWhere(
  //         (qb) => {
  //           return `NOT EXISTS (
  //         SELECT 1 FROM booking b
  //         WHERE b.entId = entertainer.id AND b.showDate = :blockedDate
  //       )`;
  //         },
  //         { blockedDate: date },
  //       );
  //     }

  //     // Fetch total count first without pagination
  //     const totalCount = await res.getCount(); // No pagination here

  //     // Fetch paginated results
  //     const results = await res
  //       .orderBy('entertainer.name', 'ASC') // Use alias here
  //       .skip(skip) // Apply pagination here
  //       .take(Number(pageSize)) // Apply pagination here
  //       .getRawMany(); // Get raw results

  //     // Process results
  //     const arr = [3, 4, 5, 2, 1]; // Example ratings logic

  //     const entertainers = results.map(
  //       ({ eid, isWishlisted, vaccinated, ...item }, index) => {
  //         return {
  //           eid: Number(eid),
  //           ...item,
  //           isWishlisted: Boolean(isWishlisted),
  //           vaccination_status:
  //             vaccinated === 'yes' ? 'Vaccinated' : 'Not Vaccinated',
  //           ratings: arr[index % arr.length], // Example for ratings
  //         };
  //       },
  //     );

  //     return {
  //       message: 'Entertainers fetched successfully',
  //       totalCount,
  //       page,
  //       pageSize,
  //       totalPages: Math.ceil(totalCount / Number(pageSize)),
  //       entertainers,
  //       status: true,
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  async findAllEntertainers(query: SearchEntertainerDto, userId: number) {
    const {
      category = [],
      sub_category = null,
      page = 1,
      pageSize = 10,
      city = null,
      date = '',
      startDate,
      endDate,
    } = query;

    // Pagination
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const DEFAULT_MEDIA_URL =
      'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';

    try {
      // Build base query with all conditions but without pagination
      const baseQuery = this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin(
          'categories',
          'category',
          'category.id = entertainer.category',
        )
        .leftJoin(
          'categories',
          'subcat',
          'entertainer.specific_category = subcat.id',
        )
        .leftJoin(
          'wishlist',
          'wish',
          'wish.ent_id = entertainer.id AND wish.user_id = :userId',
        )
        .leftJoin(
          'media',
          'media',
          'media.user_id = entertainer.id AND media.type = :mediaType',
        )
        .where("entertainer.status = 'active'")
        .setParameter('userId', userId)
        .setParameter('mediaType', 'headshot')
        .setParameter('serverUri', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', DEFAULT_MEDIA_URL);

      // Apply filters if provided
      if (category && category.length > 0) {
        baseQuery.andWhere('entertainer.category IN (:...category)', {
          category,
        });
      }

      if (sub_category) {
        baseQuery.andWhere('entertainer.specific_category = :sub_category', {
          sub_category,
        });
      }

      if (city) {
        baseQuery.andWhere('entertainer.city = :city', { city });
      }

      if (date) {
        baseQuery.andWhere(
          `NOT EXISTS (
          SELECT 1 FROM booking b
          WHERE b.entId = entertainer.id AND b.showDate = :blockedDate
        )`,
          { blockedDate: date },
        );
      }

      // First query: Get total count using a subquery to prevent pagination conflict
      const totalCount = await baseQuery
        .clone()
        .select('COUNT(DISTINCT entertainer.id)', 'count')
        .getRawOne()
        .then((result) => Number(result?.count || 0));

      // Second query: Get paginated data with all details
      // This is a completely separate query to ensure reliable pagination
      const results = await baseQuery
        .select([
          'entertainer.id AS eid',
          'entertainer.name AS name',
          'entertainer.entertainer_name AS entertainer_name',
          'entertainer.category AS category',
          'entertainer.specific_category AS specific_category',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.status AS status',
          'entertainer.bio AS bio',
          'city.name AS city',
          'state.name AS state',
          'country.name AS country',
          'category.name AS category_name',
          'subcat.name AS specific_category_name',
          `COALESCE(CONCAT(:serverUri, media.url), :defaultMediaUrl) AS mediaUrl`,
          `CASE WHEN wish.ent_id IS NOT NULL THEN 1 ELSE 0 END AS isWishlisted`,
          'wish.name AS record',
        ])
        .orderBy('entertainer.name', 'ASC')
        .offset(skip) // Use offset which is more explicit than skip for raw queries
        .limit(take) // Use limit which is more explicit than take for raw queries
        .getRawMany();

      // Process results
      const arr = [3, 4, 5, 2, 1]; // Example ratings logic

      const entertainers = results.map(
        ({ eid, isWishlisted, vaccinated, ...item }, index) => {
          return {
            eid: Number(eid),
            ...item,
            isWishlisted: Boolean(isWishlisted),
            vaccination_status:
              vaccinated === 'yes' ? 'Vaccinated' : 'Not Vaccinated',
            ratings: arr[index % arr.length], // Example for ratings
          };
        },
      );

      return {
        message: 'Entertainers fetched successfully',
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        entertainers,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(error.message);
    }
  }

  // async findAllBooking(venueId: number, query: BookingQueryDto) {
  //   const { page = 1, pageSize = 10, status = '' } = query;
  //   const skip = (Number(page) - 1) * Number(pageSize);

  //   const res = this.bookingRepository
  //     .createQueryBuilder('booking')
  //     .leftJoin('entertainers', 'entertainer', 'entertainer.id= booking.entId')
  //     .leftJoin('event', 'event', 'booking.eventId = event.id')
  //     .where('booking.venueId = :venueId', { venueId })
  //     .select([
  //       'booking.id AS id',
  //       'booking.status AS status',
  //       'booking.showDate AS showDate',
  //       'booking.showTime AS showTime',
  //       'booking.specialNotes AS specialNotes',
  //       'booking.venueId AS vid',
  //       'entertainer.id AS eid',
  //       'entertainer.name AS name',
  //       'entertainer.category AS category',
  //       'entertainer.specific_category AS  specific_category',
  //       'entertainer.performanceRole AS performanceRole',
  //       'entertainer.pricePerEvent AS pricePerEvent',
  //       'event.id AS event_id',
  //       'event.title AS event_title',
  //       'event.status AS event_status',
  //       'event.recurring AS event_recurring',
  //       'event.startTime AS event_start_time',
  //       'event.endTime AS event_end_time',
  //       'event.eventDate AS event_date',
  //       'event.description AS event_description',
  //     ]);
  //   if (status) {
  //     res.andWhere('booking.status=:status', { status });
  //   }
  //   const totalCount = await res.getCount();
  //   const results = await res
  //     .orderBy('booking.createdAt', 'DESC')
  //     .skip(skip)
  //     .take(Number(pageSize))
  //     .getRawMany();

  //   return {
  //     message: 'Bookings returned successfully',
  //     count: totalCount,
  //     bookings: results,
  //     totalPages: Math.ceil(totalCount / Number(pageSize)),
  //     page,
  //     pageSize,
  //     status: true,
  //   };
  // }

  async findAllBooking(venueId: number, query: BookingQueryDto) {
    const { page = 1, pageSize = 10, status = '' } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    try {
      // Base query builder
      const baseQuery = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('event', 'event', 'booking.eventId = event.id')
        .where('booking.venueId = :venueId', { venueId });

      // Apply status filter if provided
      if (status) {
        baseQuery.andWhere('booking.status = :status', { status });
      }

      // Get total count
      const totalCount = await baseQuery
        .clone()
        .select('COUNT(DISTINCT booking.id)', 'count')
        .getRawOne()
        .then((result) => Number(result?.count || 0));

      // Get paginated results
      const results = await baseQuery
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showDate AS showDate',
          'booking.showTime AS showTime',
          'booking.specialNotes AS specialNotes',
          'booking.venueId AS vid',
          'entertainer.id AS eid',
          'entertainer.name AS name',
          'entertainer.category AS category',
          'entertainer.specific_category AS specific_category',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.pricePerEvent AS pricePerEvent',
          'event.id AS event_id',
          'event.title AS event_title',
          'event.status AS event_status',
          'event.recurring AS event_recurring',
          'event.startTime AS event_start_time',
          'event.endTime AS event_end_time',
          'event.eventDate AS event_date',
          'event.description AS event_description',
        ])
        .orderBy('booking.createdAt', 'DESC')
        .offset(skip)
        .limit(take)
        .getRawMany();

      return {
        message: 'Bookings returned successfully',
        count: totalCount,
        bookings: results,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        page,
        pageSize,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
  // Update Venue
  async updateVenueWithMedia(
    venueId: number,
    dto: UpdateVenueRequest,
    uploadedFiles: UploadedFile[],
  ) {
    const { venue } = dto;
    let res;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const existingVenue = await queryRunner.manager.findOne(Venue, {
      where: { id: venueId },
    });

    if (!existingVenue) {
      throw new NotFoundException('Venue not Found.');
    }
    try {
      await queryRunner.manager.update(Venue, { id: existingVenue.id }, venue);
      if (uploadedFiles?.length > 0) {
        res = await this.mediaService.handleMediaUpload(
          existingVenue.id,
          uploadedFiles,
          { eventId: null },
        );
      }

      const message = res
        ? 'Venue updated successfully with Media'
        : 'Venue Details updated Successfully';
      return { message, status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  // Changed
  async handleRemoveVenue(id: number) {
    const venue = await this.venueRepository.findOne({
      where: { id: id },
    });

    if (!venue) {
      throw new NotFoundException({
        message: 'Venue not found',
        status: false,
      });
    }

    try {
      await this.venueRepository.delete({ id: venue.id });

      return { message: 'Venue deleted successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findEntertainerDetails(id: number, venueId: number) {
    const res = await this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
      .leftJoin('categories', 'category', 'category.id = entertainer.category')
      .leftJoin(
        'wishlist',
        'wish',
        'wish.ent_id = entertainer.id AND wish.user_id = :venueId',
      )
      .leftJoin(
        'categories',
        'subcat',
        'subcat.id = entertainer.specific_category',
      )

      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS media_user_id', // expose user_id
              `JSON_ARRAYAGG(
                JSON_OBJECT(
                  "url", CONCAT(:serverUri, media.url),
                  "type", media.type
                )
              ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media', // alias for the subquery
        'media.media_user_id = entertainer.id', // now using the alias correctly
      )

      .select([
        'entertainer.id AS eid',
        'entertainer.name AS entertainer_name',
        'entertainer.category AS category',
        'entertainer.specific_category AS specific_category',
        'category.name AS category_name',
        'subcat.name AS specific_category_name',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.contact_person AS contactPerson',
        'entertainer.contact_number AS contactNumber',
        'state.name AS stateName',
        'country.name AS countryName',
        'city.name AS cityName',
        'code.StateCode AS stateCode',

        `CASE 
       WHEN entertainer.services IS NULL OR entertainer.services = '' 
       THEN '[]' 
     ELSE entertainer.services 
     END AS services`,
        'entertainer.bio AS bio',
        'entertainer.vaccinated AS vaccinated',

        'COALESCE(media.mediaDetails, "[]") AS media',
        `CASE
        WHEN wish.ent_id IS NOT NULL THEN 1
        ELSE 0
        END AS isWishlisted`,
      ])
      .where('entertainer.id = :id', { id })
      .setParameter('serverUri', this.config.get<string>('BASE_URL'))
      .setParameter('venueId', venueId)
      .getRawOne();

    // Parse JSON fields
    const { services, media, vaccinated, isWishlisted, ...details } = res;
    return {
      message: 'Entertainer Details returned Successfully',
      data: {
        ...details,
        isWishlisted: Boolean(isWishlisted),
        vaccination_status:
          vaccinated === 'yes' ? 'Vaccinated' : 'Not Vaccinated',
        services: services ? services.split(',') : [],
        media: JSON.parse(media),
      },
      status: true,
    };
  }
  // Working
  async getSearchSuggestions(query: string) {
    const categories = await this.catRepository.find({
      where: { name: Like(`%${query}%`), parentId: 0 },
    });

    return {
      message: 'Categories returned successfully',
      data: categories,
      status: true,
    };
  }

  async getAllEntertainersByCategory(cid: number) {
    const results = await this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS user_id',
              "JSON_ARRAYAGG(JSON_OBJECT('id', media.id, 'url', CONCAT(:serverUri, media.url), 'type', media.type, 'name', media.name)) AS mediaFiles",
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media',
        'media.user_id = entertainer.id',
      )

      .select([
        'entertainer.id AS eid',
        'entertainer.name AS name',
        'entertainer.bio AS bio',
        'entertainer.category AS category',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.availability AS availability',
        'entertainer.socialLinks AS socialLinks',
        'COALESCE(media.mediaFiles, "[]") AS media',
      ])
      .where('entertainer.category = :cid', { cid })
      .setParameter('serverUri', process.env.SERVER_URI)
      .getRawMany();

    // Parse JSON fields
    const entertainers = results.map((item) => ({
      ...item,
      bookings: JSON.parse(item.bookings), // Convert string JSON to array
      media: JSON.parse(item.media),
    }));

    return {
      message: 'Entertainers returned Successfully',
      data: entertainers,
      status: true,
    };
  }

  async addVenueLocation(userId: number, locDto: VenueLocationDto) {
    const parentVenue = await this.venueRepository.findOne({
      where: { user: { id: userId }, isParent: true },
    });

    if (!parentVenue) {
      throw new BadRequestException({
        message: 'Can not Add venue Location',
        status: false,
        error: 'Parent venue do not exists',
      });
    }

    try {
      const venueLoc = this.venueRepository.create({
        ...locDto,
        name: parentVenue.name,
        user: { id: userId },
        description: parentVenue.description,
        parentId: parentVenue.id,
        isParent: false,
      });

      await this.venueRepository.save(venueLoc);
      return {
        message: 'Venue location added successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error adding venue location',
        status: false,
        error: error.message,
      });
    }
  }

  async getAllCategories(query: Data) {
    const { category } = query;

    const id = category ? Number(category) : 0;

    const categories = await this.catRepository.find({
      where: { parentId: id },
      select: ['id', 'name', 'iconUrl'],
    });
    const plainCat = instanceToPlain(categories);

    const baseUrl = this.config.get<string>('BASE_URL');
    const Data = categories.map(({ iconUrl, ...rest }) => ({
      ...rest,
      activeIcon: `${baseUrl}${iconUrl}`,
      inactiveIcon: `${baseUrl}${iconUrl.replace(/(\.\w+)$/, '_grey$1')}`,
    }));

    const filter = plainCat.map((item) => ({
      label: item.name,
      value: item.id,
    }));

    const filterData = {
      filters: [
        {
          type: 'checkbox',
          label: 'Price',
          data: [
            { label: '500-1000', value: 1 },
            { label: '1000-2000', value: 2 },
            { label: '2000-3000', value: 3 },
            { label: '3000-4000', value: 4 },
            { label: '4000-5000', value: 5 },
          ],
        },
        { type: 'checkbox', label: 'Category', data: filter },
        { type: 'select', label: 'Location' },
      ],
      categories: { type: 'checkbox', label: 'category', data: Data },
    };
    return {
      message: 'Filters fetched Successfully',
      data: filterData,
      status: true,
    };
  }

  async toggleWishlist(venueId: number, wishDto: WishlistDto) {
    // Check if entertainer is already in wishlist
    const { entId, ...wish } = wishDto;

    const existingWishlist = await this.wishRepository.findOne({
      where: { user_id: venueId, ent_id: entId },
    });

    if (existingWishlist) {
      // Remove from wishlist if already present
      const res = await this.wishRepository.remove(existingWishlist);
      return { message: 'Entertainer Removed from wishlist', status: true };
    }
    //  Add to wishlist if not present
    try {
      const wishlistItem = this.wishRepository.create({
        ...wish,
        ent_id: entId,
        user_id: venueId,
      });
      await this.wishRepository.save(wishlistItem);
      return { message: 'Entertainer Added to wishlist', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error adding entertainer to wishlist',
        error: error.message,
        status: false,
      });
    }
  }

  async getWishlist(venueId: number) {
    const wishlistItems = await this.wishRepository
      .createQueryBuilder('wish')
      .leftJoin(
        'categories',
        'cat',
        'cat.id = wish.category AND cat.parentId = 0',
      )
      .leftJoin(
        'categories',
        'subcat',
        'subcat.id = wish.specific_category AND subcat.parentId = wish.category ',
      )
      .select([
        'wish.id',
        'wish.name AS name',
        'wish.category AS category',
        'wish.specific_category AS specific_category',
        'wish.ent_id AS eid',
        'wish.username AS user_name',
        'wish.url AS mediaUrl',
        'wish.ratings AS ratings',
        'cat.name AS category_name',
        'subcat.name AS specific_category_name',
      ])
      .where('wish.user_id = :venueId', { venueId })
      .getRawMany();

    return {
      message: 'Wishlist fetched Successfully',
      data: wishlistItems,
      status: true,
    };
  }

  async removeFromWishlist(id: number, venueId: number) {
    const wishlistItem = await this.wishRepository.findOne({
      where: { ent_id: id, user_id: venueId },
    });

    if (!wishlistItem) {
      throw new NotFoundException({
        message: 'Wishlist item not found',
        status: false,
      });
    }

    await this.wishRepository.remove(wishlistItem);
    return { message: 'Wishlist item removed successfully', status: true };
  }

  // Creation Logic Neighbourhood
  async create(dto: CreateNeighbourhoodDto, venueId: number) {
    const neighbourhood = this.neighbourRepository.create({ ...dto, venueId });
    const saved = await this.neighbourRepository.save(neighbourhood);
    return {
      message: 'Neighbourhood added successfully',
      data: saved,
      status: true,
    };
  }

  async update(id: number, dto: UpdateNeighbourhoodDto) {
    await this.neighbourRepository.update(id, dto);
    return { message: 'Neighbourhood updated successfully', status: true };
  }

  async getVenueNeighbourhoods(id: number) {
    const res = await this.neighbourRepository.find({
      where: { venueId: id },
    });
    return {
      message: 'Neighbourhood fetched successfully',
      data: res,
      totalCount: res.length,
      status: true,
    };
  }
  async neighbourhoodById(id: number) {
    const res = await this.neighbourRepository.findOne({
      where: { id: id },
    });
    return {
      message: 'Neighbourhood fetched successfully',
      data: res,
      status: true,
    };
  }

  async removeNeighbourhood(id: number) {
    const result = await this.neighbourRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Neighbourhood not found');
    }
    return { message: 'Neighbourhood deleted successfully', status: true };
  }

  async getEventDetailsByMonth(venueId: number, query: EventsByMonthDto) {
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
        .where('booking.venueId = :venueId', { venueId })
        .andWhere('YEAR(event.eventDate) = :year', { year })
        .andWhere('MONTH(event.eventDate) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.slug AS slug',
          'event.location AS location',
          'event.eventDate AS eventDate',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.status AS status',
        ])
        .orderBy('event.eventDate', 'ASC');

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
}
