import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { SearchEntertainerDto } from './dto/serach-entertainer.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { User } from '../users/entities/users.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Media } from '../media/entities/media.entity';
import { Category } from '../entertainer/entities/categories.entity';

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
  ) {}

  async create(createVenueDto: CreateVenueDto, userId: number) {
    const venue = this.venueRepository.create({
      ...createVenueDto,
      user: { id: userId },
    });
    await this.venueRepository.save(venue);

    return { message: 'Venue created successfully', venue, status: true };
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
        'lat',
        'long',
        'amenities',
        'websiteUrl',
        'bookingPolicies',
      ],
    });

    const resultingVenue = await Promise.all(
      venues.map(async (item) => {
        const venueId = item.id;
        const media = await this.mediaRepository
          .createQueryBuilder('media')
          .select([
            'media.id AS id',
            `CONCAT('${process.env.SERVER_URI}', media.url) AS url`,
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

  async findOneByUser(id: number, userId: number) {
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
        'bookingPolicies',
      ],
    });

    if (!venue) {
      throw new NotFoundException({
        message: 'Venue not found',
        error: ' Not Found',
        status: false,
      });
    }

    return { message: 'Venue fetched successfully', venue, status: true };
  }
  // My code

  // async findAllEntertainers(query: SearchEntertainerDto) {
  //   const {
  //     availability = '',
  //     category = '',
  //     search = '',
  //     page = 1,
  //     pageSize = 10,
  //   } = query;

  //   // Number of records per page
  //   const skip = (Number(page) - 1) * Number(pageSize); // Calculate offset

  //   const res = this.entertainerRepository
  //     .createQueryBuilder('entertainer')
  //     .leftJoinAndSelect('entertainer.user', 'user')
  //     .select([
  //       'entertainer.id AS id',
  //       'user.id AS eid',
  //       'entertainer.name AS name',
  //       'entertainer.category AS category',
  //       'entertainer.specific_category AS specific_category',
  //       'entertainer.performanceRole AS performanceRole',
  //       'entertainer.pricePerEvent AS pricePerEvent',
  //       'entertainer.vaccinated AS vaccinated',
  //       'entertainer.availability AS availability',
  //       'entertainer.status AS status',
  //       'user.email AS email', // Example: More control over user relation
  //     ]);

  //   if (availability) {
  //     res.andWhere('entertainer.availability = :availability', {
  //       availability,
  //     });
  //   }

  //   // Apply `type` filter if provided
  //   if (category) {
  //     res.andWhere('entertainer.category = :category', { category });
  //   }

  //   // Apply search filter if provided (searches across multiple fields)
  //   if (search.trim() !== '') {
  //     res.andWhere(
  //       `(entertainer.name LIKE :search OR
  //           entertainer.category LIKE :search OR
  //           entertainer.bio LIKE :search OR
  //           entertainer.performanceRole LIKE :search OR
  //           entertainer.phone1 LIKE :search OR
  //           entertainer.phone2 LIKE :search OR
  //           entertainer.status LIKE :search OR
  //           user.email LIKE :search)`, // Example: Searching user email too
  //       { search: `%${search}%` },
  //     );
  //   }

  //   // Get total count before pagination
  //   const totalCount = await res.getCount();

  //   // // Apply pagination
  //   const results = await res.skip(skip).take(Number(pageSize)).getRawMany();

  //   const entertainers = await Promise.all(
  //     results.map(async (item) => {
  //       const userId = item.eid;

  //       const bookings = await this.bookingRepository.find({
  //         where: { entertainerUser: { id: item.eid }, status: 'confirmed' },
  //         select: ['showDate', 'showTime'],
  //       });

  //       const media = await this.mediaRepository
  //         .createQueryBuilder('media')
  //         .select([
  //           'media.id AS id',
  //           `CONCAT('${process.env.SERVER_URI}', media.url) AS url`,
  //           'media.type AS type',
  //           'media.name  AS name',
  //         ])
  //         .where('media.userId = :userId', { userId })
  //         .getRawMany();

  //       return {
  //         ...item,
  //         media,
  //         bookedFor: bookings,
  //       };
  //     }),
  //   );

  //   return {
  //     message: 'Entertainers fetched Sucessfully',
  //     totalCount,
  //     page,
  //     pageSize, // Records per Page
  //     totalPages: Math.ceil(totalCount / Number(pageSize)),
  //     entertainers,
  //     status: true,
  //   };
  // }

  // To find Booking related to Venue user
  async findAllEntertainers(query: SearchEntertainerDto) {
    const {
      availability = '',
      category = '',
      search = '',
      page = 1,
      pageSize = 10,
    } = query;

    // Pagination
    const skip = (Number(page) - 1) * Number(pageSize);

    // Base Query
    const res = this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoinAndSelect('entertainer.user', 'user') // Join with user table
      .leftJoin(
        (qb) =>
          qb
            .select([
              'booking.entertainerUserId',
              'JSON_ARRAYAGG(DISTINCT JSON_OBJECT("showDate", booking.showDate, "showTime", booking.showTime)) AS bookedDates',
            ])
            .from('booking', 'booking')
            .where('booking.status = :confirmed', { confirmed: 'confirmed' })
            .groupBy('booking.entertainerUserId'),
        'bookings',
        'bookings.entertainerUserId = user.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.userId',
              "JSON_ARRAYAGG(JSON_OBJECT('id', media.id, 'url', CONCAT(:serverUri, media.url), 'type', media.type, 'name', media.name)) AS mediaFiles",
            ])
            .from('media', 'media')
            .groupBy('media.userId'),
        'media',
        'media.userId = user.id',
      )
      .select([
        'entertainer.id AS id',
        'user.id AS eid',
        'entertainer.name AS name',
        'entertainer.category AS category',
        'entertainer.specific_category AS specific_category',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.vaccinated AS vaccinated',
        'entertainer.availability AS availability',
        'entertainer.status AS status',
        'user.email AS email',
        'COALESCE(bookings.bookedDates, "[]") AS bookedFor', // Default empty array if no bookings
        'COALESCE(media.mediaFiles, "[]") AS media',
      ])
      .setParameter('serverUri', process.env.SERVER_URI);

    // Filters
    if (availability) {
      res.andWhere('entertainer.availability = :availability', {
        availability,
      });
    }

    if (category) {
      res.andWhere('entertainer.category = :category', { category });
    }

    if (search.trim() !== '') {
      res.andWhere(
        `(
          LOWER(entertainer.name) LIKE :search OR
          LOWER(entertainer.category) LIKE :search OR
          LOWER(entertainer.bio) LIKE :search OR
          LOWER(entertainer.performanceRole) LIKE :search OR
          LOWER(entertainer.phone1) LIKE :search OR
          LOWER(entertainer.phone2) LIKE :search OR
          LOWER(entertainer.status) LIKE :search OR
          LOWER(user.email) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` },
      );
    }

    // Get total count before pagination
    const totalCount = await res.getCount();

    // Apply pagination
    const results = await res.skip(skip).take(Number(pageSize)).getRawMany();

    // Parse JSON fields
    const entertainers = results.map((item) => ({
      ...item,
      bookedFor: JSON.parse(item.bookedFor),
      media: JSON.parse(item.media),
    }));

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
      .leftJoinAndSelect('booking.entertainerUser', 'entertainerUser')
      .leftJoinAndSelect('entertainerUser.entertainer', 'entertainer')
      .where('booking.venueUser.id = :userId', { userId })
      .select([
        'booking.id AS id',
        'booking.status AS status',
        'booking.showDate AS showDate',
        'booking.isAccepted AS isAccepted',
        'booking.specialNotes AS specialNotes',
        'booking.venueId AS vid',
        'entertainerUser.id AS eid',
        'entertainerUser.email AS email',
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

    if (!bookings) {
      throw new Error('No bookings found');
    }

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

    const updateVenue = await this.venueRepository.update(
      { id: venue.id },
      details,
    );
    if (updateVenue.affected) {
      return { message: 'Venue updated successfully', status: true };
    } else {
      throw new InternalServerErrorException({
        message: 'something went wrong ',
        status: false,
      });
    }
  }

  async handleRemoveVenue(id: number, userId: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { id: id, user: { id: userId } },
      });

      if (!venue) {
        throw new NotFoundException({
          message: 'Venue not found',
          status: false,
        });
      }

      const res = await this.venueRepository.delete({ id: venue.id });

      if (res.affected && res.affected > 0) {
        return { message: 'Venue deleted successfully', status: true };
      }
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'something went wrong',
        status: false,
      });
    }
  }

  async findEntertainerDetails(userId: number) {
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

    if (!details)
      throw new NotFoundException({
        message: 'Entertainer details not found',
        status: false,
      });

    const media = await this.mediaRepository
      .createQueryBuilder('media')
      .select([
        'media.id AS id',
        `CONCAT('${process.env.SERVER_URI}', media.url) AS url`,
        'media.type AS type',
        'media.name  AS name',
      ])
      .where('media.userId = :userId', { userId })
      .getRawMany();

    return {
      message: 'Entertainer Details returned Successfully ',
      entertainer: { ...details, media: media },
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
        // Selecting only the ID from the user table
      ])
      .where('entertainer.category = :cid', { cid })
      .getRawMany();
    const entertainers = await Promise.all(
      results.map(async (item) => {
        const userId = item.eid;
        const media = await this.mediaRepository
          .createQueryBuilder('media')
          .select([
            'media.id AS id',
            `CONCAT('${process.env.SERVER_URI}', media.url) AS url`,
            'media.type AS type',
            'media.name  AS name',
          ])
          .where('media.userId = :userId', { userId })
          .getRawMany();

        return {
          ...item,
          media,
        };
      }),
    );

    return {
      message: 'Entertainers returned Successfully ',
      data: entertainers,
      status: true,
    };
  }
}
