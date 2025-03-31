import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Like, Repository } from 'typeorm';
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
    private readonly config: ConfigService,
    private readonly mediaService: MediaService,
    private readonly dataSource: DataSource,
  ) {}

  // async create(
  //   createVenueDto: CreateVenueDto,
  //   userId: number,
  //   uploadedFiles: UploadedFile[],
  // ) {
  //   const venueExists = await this.venueRepository.findOne({
  //     where: { user: { id: userId } },
  //   });

  //   if (venueExists) {
  //     throw new BadRequestException({
  //       message: 'Venue already exists for the user',
  //       status: false,
  //     });
  //   }
  //   const venue = this.venueRepository.create({
  //     ...createVenueDto,
  //     user: { id: userId },
  //     parentId: null,
  //     isParent: true,
  //   });
  //   const saved = await this.venueRepository.save(venue);

  //   await this.mediaService.handleMediaUpload(userId, uploadedFiles, {
  //     venueId: saved.id,
  //   });

  //   return { message: 'Venue created successfully', venue, status: true };
  // }

  // New Method to create Venue with Media
  async createVenueWithMedia(
    dto: CreateVenueDto,
    userId: number,
    uploadedFiles: UploadedFile[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    const venueExists = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (venueExists) {
      throw new BadRequestException({
        message: 'Venue already exists for the user',
        status: false,
      });
    }

    try {
      const venue = this.venueRepository.create({
        ...dto,
        user: { id: userId },
        parentId: null,
        isParent: true,
      });

      const savedVenue = await queryRunner.manager.save(venue);

      // Step 2: Upload media (calls external service)
      const mediaUploadResult = await this.mediaService.handleMediaUpload(
        userId,
        uploadedFiles,
        {
          venueId: savedVenue.id,
        },
      );

      // Step 3: Commit transaction if everything is successful
      await queryRunner.commitTransaction();

      return {
        message: 'Venue is Successfully creates with media',
        data: dto,
        status: true,
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
            `CONCAT('${this.config.get<string>('BASE_URl')}', media.url) AS url`,
            'media.type AS type',
            'media.name  AS name',
          ])
          .where('media.userId = :userId', { userId })
          .andWhere('media.refId = :venueId', { venueId })
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

  async findVenueLocation(id: number, userId: number) {
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
    } = query;

    console.log('category', category, 'price', price);

    const skip = (Number(page) - 1) * Number(pageSize);

    const DEFAULT_MEDIA_URL = this.config.get<string>('MEDIA_URL');

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
      .leftJoinAndSelect('entertainer.user', 'user')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('categories', 'category', 'category.id = entertainer.category')
      .leftJoin('categories', 'subcat', 'specific_category = subcat.id')
      .leftJoin(
        'wishlist',
        'wish',
        'wish.ent_id = user.id AND wish.user_id = :userId',
        { userId },
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'booking.entertainerUserId', // Use the actual foreign key column
              `JSON_ARRAYAGG(
                DISTINCT JSON_OBJECT(
                  "showDate", booking.showDate, 
                  "showTime", booking.showTime
                )
              ) AS bookedDates`,
            ])
            .from('booking', 'booking')
            .where('booking.status = "confirmed"')
            .groupBy('booking.entertainerUserId'), // Ensure this matches the foreign key column
        'bookings',
        'bookings.entertainerUserId = user.id', // Ensure it maps correctly to the User table
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.userId',
              `COALESCE(MAX(CONCAT(:serverUri, media.url)), :defaultMediaUrl) AS mediaUrl`,
            ])

            .from('media', 'media')
            .where('media.type = "headshot"')
            .groupBy('media.userId'),
        'media',
        'media.userId = user.id',
      )
      .select([
        'user.id AS eid',
        'user.name AS user_name',
        'entertainer.name AS name',
        'entertainer.category AS category',
        'entertainer.specific_category AS specific_category',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.vaccinated AS vaccinated',
        'entertainer.availability AS availability',
        'entertainer.status AS status',
        'entertainer.bio AS bio',
        'user.email AS email',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'category.name AS category_name',
        'subcat.name AS specific_category_name',
        'media.mediaUrl As mediaUrl',
        'COALESCE(bookings.bookedDates, "[]") AS bookedFor',
        `CASE
     WHEN wish.ent_id IS NOT NULL THEN true
     ELSE false
     END AS isWishlisted`,
      ])
      .setParameter('serverUri', process.env.BASE_URL)
      .setParameter('defaultMediaUrl', DEFAULT_MEDIA_URL);

    // **Availability Filter**
    if (availability) {
      res.andWhere('entertainer.availability = :availability', {
        availability,
      });
    }

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

    // **Search Filter**
    // (search && search.trim()) {
    //   res.andWhere(
    //     `(
    //       LOWER(entertainer.name) LIKE :search OR
    //       LOWER(entertainer.bio) LIKE :search OR
    //       LOWER(user.email) LIKE :search
    //     )`,
    //     { search: `%${search.toLowerCase()}%` }
    //   );
    // }

    const totalCount = await res.getCount();
    const results = await res.skip(skip).take(Number(pageSize)).getRawMany();

    // Base Query
    const arr = [3, 4, 5, 2, 1];

    // Parse JSON fields
    const entertainers = results.map(
      ({ isWishListed, bookedFor, ...item }, index) => {
        return {
          ...item,
          isWishlisted: Boolean(isWishListed),
          ratings: arr[index % arr.length],
          whatwillyouget: [
            { text: 'you will get full service' },
            { text: 'you will get full Satisfaction' },
            { text: 'Professional Talent' },
            { text: 'An feeling of sophistication' },
            { text: 'Experince of life' },
          ],
          bookedFor: JSON.parse(bookedFor),
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

  async findAllBooking(userId: number) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('user.entertainer', 'entertainer')
      .where('booking.venueUser.id = :userId', { userId })
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'booking.showDate AS showDate',
        'booking.isAccepted AS isAccepted',
        'booking.specialNotes AS specialNotes',
        'booking.venueId AS vid',
        'user.id AS eid',
        'user.email AS email',
        'user.name AS username',
        'entertainer.name AS name',
        'entertainer.category AS category',
        'entertainer.specific_category AS  specific_category',
        'entertainer.phone1 AS phone1',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.availability AS availability',
        'entertainer.pricePerEvent AS pricePerEvent',
      ])
      .orderBy('booking.createdAt', 'DESC')
      .getRawMany();

    return {
      message: 'Bookings returned successfully',
      count: bookings.length,
      bookings,
      status: true,
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
      throw new NotFoundException({
        message: 'Venue not found',
        error: 'Not Found',
        status: 'false',
      });
    }
    try {
      await this.venueRepository.update({ id: venue.id }, details);
      return { message: 'Venue updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async handleRemoveVenue(id: number, userId: number) {
    const venue = await this.venueRepository.findOne({
      where: { id: id, user: { id: userId } },
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

  async findEntertainerDetails(userId: number) {
    const res = await this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('categories', 'category', 'category.id = entertainer.category')
      .leftJoin(
        'categories',
        'subcat',
        'subcat.id = entertainer.specific_category',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'booking.entertainerUserId',
              'JSON_ARRAYAGG(DISTINCT JSON_OBJECT("showDate", booking.showDate, "showTime", booking.showTime)) AS bookedDates',
            ])
            .from('booking', 'booking')
            .where('booking.status = "confirmed"')
            .groupBy('booking.entertainerUserId'),
        'bookings',
        'bookings.entertainerUserId = user.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.userId',
              `JSON_ARRAYAGG(
            JSON_OBJECT(
              "url", CONCAT(:serverUri, media.url),
              "type", media.type
            )
          ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.userId'),
        'media',
        'media.userId = user.id',
      )
      .select([
        'user.id AS eid',
        'user.email AS email',
        'user.name AS username',
        'entertainer.name AS entertainer_name',
        'entertainer.category AS category',
        'entertainer.specific_category AS specific_category',
        'category.name AS category_name',
        'subcat.name AS specific_category_name',
        'entertainer.phone1 AS phone1',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.availability AS availability',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.bio AS bio',
        'entertainer.vaccinated AS vaccinated',
        'COALESCE(bookings.bookedDates, "[]") AS bookedFor',
        'COALESCE(media.mediaDetails, "[]") AS media',
      ])
      .where('entertainer.userId = :userId', { userId })
      .setParameter('serverUri', this.config.get<string>('MEDIA_URL'))
      .getRawOne();

    // Parse JSON fields
    const { bookedFor, media, ...details } = res;
    return {
      message: 'Entertainer Details returned Successfully',
      data: {
        ...details,
        bookedFor: JSON.parse(bookedFor),
        media: JSON.parse(media),
      },
      status: true,
    };
  }

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
      .leftJoin('entertainer.user', 'user')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'booking.userId AS entertainerId',
              'JSON_ARRAYAGG(JSON_OBJECT("showDate", booking.showDate, "showTime", booking.showTime)) AS bookings',
            ])
            .from('booking', 'booking')
            .groupBy('booking.userId'),
        'bookings',
        'bookings.entertainerId = user.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.userId AS userId',
              "JSON_ARRAYAGG(JSON_OBJECT('id', media.id, 'url', CONCAT(:serverUri, media.url), 'type', media.type, 'name', media.name)) AS mediaFiles",
            ])
            .from('media', 'media')
            .groupBy('media.userId'),
        'media',
        'media.userId = user.id',
      )
      .select([
        'user.id AS eid',
        'entertainer.name AS name',
        'entertainer.bio AS bio',
        'entertainer.phone1 AS phone1',
        'entertainer.phone2 AS phone2',
        'entertainer.category AS category',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.availability AS availability',
        'entertainer.socialLinks AS socialLinks',
        'COALESCE(bookings.bookings, "[]") AS bookings', // Default to empty array if no bookings
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
    console.log('categories', categories);
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

  async toggleWishlist(userId: number, wishDto: WishlistDto) {
    // Check if entertainer is already in wishlist
    const { entId, ...wish } = wishDto;

    const existingWishlist = await this.wishRepository.findOne({
      where: { user_id: userId, ent_id: entId },
    });

    if (existingWishlist) {
      // Remove from wishlist if already present
      const res = await this.wishRepository.remove(existingWishlist);
      console.log('Removed Entertainer', res);
      return { message: 'Entertainer Removed from wishlist', status: true };
    }
    //  Add to wishlist if not present
    try {
      const wishlistItem = this.wishRepository.create({
        ...wish,
        ent_id: entId,
        user_id: userId,
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

  async getWishlist(userId: number) {
    const wishlistItems = await this.wishRepository.find({
      where: { user_id: userId },
      select: [
        'id',
        'name',
        'category',
        'specific_category',
        'ent_id',
        'username',
        'url',
        'ratings',
      ],
    });
    return {
      message: 'Wishlist fetched Successfully',
      data: wishlistItems,
      status: true,
    };
  }
}
