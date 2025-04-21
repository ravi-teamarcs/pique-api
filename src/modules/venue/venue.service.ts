import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
import { UpdateVenueDto } from './dto/update-venue.dto';
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
      const neighbourhood = this.neighbourRepository.create({
        ...dto,
        venueId: venue.id,
      });
      await this.neighbourRepository.save(neighbourhood);
      // update other data
      await this.venueRepository.update(
        { id: venue.id },
        { isProfileComplete: false, profileStep: 3 },
      );

      return {
        message: 'Neighbourhood added Successfully',
        data: neighbourhood,
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

      const mediaUploadResult = await this.mediaService.handleMediaUpload(
        venue.id,
        uploadedFiles,
        { eventId: null },
      );

      await this.venueRepository.update(
        { id: venue.id },
        { isProfileComplete: true, profileStep: 4 },
      );
      return { message: 'Venue Signup completed. ', step: 4, status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findAllByUser(userId: number) {
    const venues = await this.venueRepository.find({
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
        'parentId',
        'isParent',
      ],
    });

    const resultingVenue = await Promise.all(
      venues.map(async (item) => {
        const venueId = item.id;
        const media = await this.mediaRepository
          .createQueryBuilder('media')
          .select([
            'media.id AS id',
            `CONCAT('${this.config.get<string>('BASE_URL')}', media.url) AS url`,
            'media.type AS type',
            'media.name  AS name',
          ])
          .where('media.userId = :userId', { venueId }) // Changed to venueId basis
          .getRawMany();

        return {
          ...item,
          media,
        };
      }),
    );
    return {
      message: 'Venues returned successfully',
      count: venues.length,
      venues: resultingVenue,
      status: true,
    };
  }

  async findVenueLocation(id: number) {
    const venue = await this.venueRepository.find({
      where: { parentId: id },
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
        'parentId',
        'isParent',
      ],
    });

    return { message: 'Venue fetched successfully', data: venue, status: true };
  }

  async findAllEntertainers(query: SearchEntertainerDto, userId: number) {
    const {
      availability = '',
      category = [],
      sub_category = null,
      price = [],
      page = 1,
      pageSize = 10,
      city = null,
      country = null,
      date = '',
      startDate,
      endDate,
    } = query;

    // Pagination
    const skip = (Number(page) - 1) * Number(pageSize);
    const DEFAULT_MEDIA_URL =
      'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';
    const data = [
      { label: '500-1000', value: 1 },
      { label: '1000-2000', value: 2 },
      { label: '2000-3000', value: 3 },
      { label: '3000-4000', value: 4 },
      { label: '4000-5000', value: 5 },
    ];

    const priceRange = data
      .filter((item) => price.includes(item.value)) // Filter only matching values
      .map((item) => {
        const [min, max] = item.label.split('-').map(Number); // Extract min and max from label
        return { min, max };
      });

    const res = this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('categories', 'category', 'category.id = entertainer.category')
      .leftJoin('categories', 'subcat', 'specific_category = subcat.id')
      .leftJoin(
        'wishlist',
        'wish',
        'wish.ent_id = entertainer.id AND wish.user_id = :userId',
      )

      .leftJoin(
        (qb) =>
          qb
            .select([
              'entertainer.id AS entertainer_id',
              `
              COALESCE(
                MAX(CASE WHEN media.type = 'headshot' THEN CONCAT(:serverUri, media.url) END),
                :defaultMediaUrl
              ) AS media_url
              `,
            ])
            .from('entertainers', 'entertainer')
            .leftJoin('media', 'media', 'media.user_id = entertainer.id')
            .groupBy('entertainer.id'),
        'media',
        'media.entertainer_id = entertainer.id',
      )

      .select([
        'entertainer.id AS eid',
        'entertainer.name AS name',
        'entertainer.category AS category',
        'entertainer.specific_category AS specific_category',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.vaccinated AS vaccinated',
        'entertainer.availability AS availability',
        'entertainer.status AS status',
        'entertainer.bio AS bio',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'category.name AS category_name',
        'subcat.name AS specific_category_name',
        'media.media_url As mediaUrl',
        `CASE
     WHEN wish.ent_id IS NOT NULL THEN 1
     ELSE 0
     END AS isWishlisted`,
        'wish.name AS  record',
      ])
      .setParameter('serverUri', this.config.get<string>('BASE_URL'))
      .setParameter('defaultMediaUrl', DEFAULT_MEDIA_URL)
      .setParameter('userId', userId);

    // Use getRawMany() to retrieve raw data

    // **Category Filter (Applies Only If Not Null)**
    if (category !== null && category.length > 0) {
      res.andWhere('entertainer.category IN (:...category)', { category });
    }

    // **Sub-Category Filter**
    if (sub_category) {
      res.andWhere('entertainer.specific_category = :sub_category', {
        sub_category,
      });
    }

    // **Price Range Filter (Supports Multiple Ranges)**
    if (priceRange !== null && priceRange.length > 0) {
      res.andWhere(
        new Brackets((qb) => {
          const conditions: string[] = [];
          const params: Record<string, number> = {};

          priceRange.forEach((range, index) => {
            const minKey = `min${index}`;
            const maxKey = `max${index}`;

            conditions.push(
              `entertainer.pricePerEvent BETWEEN :${minKey} AND :${maxKey}`,
            );
            params[minKey] = range.min;
            params[maxKey] = range.max;
          });

          qb.where(conditions.join(' OR '), params);
        }),
      );
    }
    // **City Filter**
    if (city) {
      res.andWhere('entertainer.city = :city', { city });
    }

    if (date) {
      res.andWhere(
        (qb) => {
          return `NOT EXISTS (
            SELECT 1 FROM booking b
            WHERE b.entId = entertainer.id AND b.showDate = :blockedDate
          )`;
        },
        { blockedDate: date },
      );
    }

    //  Logic for filter b/w dates (both are inclusive.)

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      console.log('Inside start Date');
      if (end < start) {
        throw new BadRequestException({
          message: 'endDate cannot be earlier than startDate',
          status: false,
        });
      }
      res.andWhere(
        (qb) => {
          return `NOT EXISTS (
            SELECT 1 FROM booking b
            WHERE b.entId = entertainer.id
            AND b.showDate BETWEEN :startDate AND :endDate
          )`;
        },
        { startDate, endDate },
      );
    }

    const totalCount = await res.getCount();
    const results = await res
      .orderBy('entertainer.name', 'ASC')
      .skip(skip)
      .take(Number(pageSize))
      .getRawMany();

    // Base Query
    const arr = [3, 4, 5, 2, 1];

    // Parse JSON fields
    const entertainers = results.map(
      ({ eid, isWishlisted, vaccinated, ...item }, index) => {
        return {
          eid: Number(eid),
          ...item,
          isWishlisted: Boolean(isWishlisted),
          vaccination_status:
            vaccinated === 'yes' ? 'Vaccinated' : 'Not Vaccinated',
          ratings: arr[index % arr.length],
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
  }

  async findAllBooking(venueId: number, query: BookingQueryDto) {
    const { page = 1, pageSize = 10, status = '' } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const res = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id= booking.entId')
      .leftJoin('event', 'event', 'booking.eventId = event.id')
      .where('booking.venueId = :venueId', { venueId })
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
        'entertainer.specific_category AS  specific_category',
        'entertainer.phone1 AS phone1',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.availability AS availability',
        'entertainer.pricePerEvent AS pricePerEvent',
        'event.id AS event_id',
        'event.title AS event_title',
        'event.status AS event_status',
        'event.recurring AS event_recurring',
        'event.startTime AS event_start_time',
        'event.endTime AS event_end_time',
        'event.description AS event_description',
      ]);
    if (status) {
      res.andWhere('booking.status=:status', { status });
    }
    const totalCount = await res.getCount();
    const results = await res
      .orderBy('booking.createdAt', 'DESC')
      .skip(skip)
      .take(Number(pageSize))
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
  }
  // Update Venue
  async updateVenue(venueId: number, dto: UpdateVenueDto) {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
    });

    if (!venue) {
      throw new NotFoundException({
        message: 'Venue not found',
        error: 'Not Found',
        status: 'false',
      });
    }
    try {
      await this.venueRepository.update({ id: venue.id }, dto);
      return { message: 'Venue updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
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
        'entertainer.phone1 AS phone1',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.availability AS availability',
        'entertainer.pricePerEvent AS pricePerEvent',
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

    console.log('Response of Entertainer', res);
    // Parse JSON fields
    const { services, media, vaccinated, isWishlisted, ...details } = res;
    return {
      message: 'Entertainer Details returned Successfully',
      data: {
        ...details,
        isWishlisted: Boolean(isWishlisted),
        vaccination_status:
          vaccinated === 'yes' ? 'Vaccinated' : 'Not Vaccinated',
        services: JSON.parse(services),
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

    const Data = plainCat.map(({ iconUrl, ...rest }) => ({
      ...rest,
      activeIcon: iconUrl,
      inactiveIcon: iconUrl.replace(/(\.\w+)$/, '_grey$1'), // Adds "_gray" before file extension
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

  // Is Booking Allowed

  // async isBookingAllowed(
  //   userId: number,
  //   bookingDate,
  //   startTime: string,
  //   endTime: string,
  // ) {
  //   const dayOfWeek = new Date(bookingDate).toLocaleString('en-US', {
  //     weekday: 'long',
  //   });

  //   console.log('Day of Week ', dayOfWeek);

  //   // Check if date lies is unavailability.
  //   const isUnavailable = await this.unavailabilityRepo.findOne({
  //     where: { user: userId, date: bookingDate },
  //   });
  //   if (isUnavailable) {
  //     throw new BadRequestException({
  //       message: 'The entertainer is unavailable on this date.',
  //       status: false,
  //     });
  //   }

  //   // Check if time slot is within availability
  //   const availableSlot = await this.availabilityRepo.findOne({
  //     where: {
  //       user: userId,
  //       dayOfWeek,
  //       startTime: LessThanOrEqual(startTime),
  //       endTime: MoreThanOrEqual(endTime),
  //     },
  //   });
  //   if (!availableSlot) {
  //     throw new BadRequestException({
  //       message: "Requested time is outside of entertainer'\s availability.",
  //       status: false,
  //     });
  //   }

  //   // Check for booking overlap (assuming you have a Booking entity) (And for Slot )

  //   const overlap = await this.bookingRepository.findOne({
  //     where: {
  //       entertainerUser: { id: userId },
  //       showDate: bookingDate,
  //       // startTime: LessThan(endTime),
  //       // endTime: MoreThan(startTime),
  //     },
  //   });

  //   if (overlap) {
  //     throw new BadRequestException({
  //       message:
  //         'The entertainer already has a booking that overlaps with the requested time.',
  //       status: false,
  //     });
  //   }
  // }
}
