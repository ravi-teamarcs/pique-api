import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { instanceToPlain } from 'class-transformer';
import { Media } from '../media/entities/media.entity';
import { ConfigService } from '@nestjs/config';
import { Neighbourhood } from '../venue/entities/neighbourhood.entity';
import { Category } from '../entertainer/entities/categories.entity';
import { EntertainerCategorySubcategory } from '../entertainer/entities/entertainer-category-subcategory.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(EntertainerCategorySubcategory)
    private readonly entCatRepository: Repository<EntertainerCategorySubcategory>,
    private readonly config: ConfigService,
  ) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new HttpException('Email already in use', HttpStatus.CONFLICT);
    }

    const newUser = this.userRepository.create({
      ...createUserDto,
      isVerified: true,
    });
    return this.userRepository.save(newUser);
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Update user by ID
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    const user = await this.findById(id);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const updatedUser = Object.assign(user, updateUserDto);
    return this.userRepository.save(updatedUser);
  }

  /**
   * Delete user by ID
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.userRepository.delete(id);

    if (result.affected === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return true;
  }

  // User Profile

  async handleGetUserProfile(userId: number, role: string) {
    try {
      if (role === 'venue') {
        return this.getVenueDetails(userId);
      } else {
        return this.getEntertainerDetails(userId);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getVenueDetails(userId: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });
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
                "id",media.id,
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
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
          'venue.state AS state_code',
          'venue.country AS country_code',
          'venue.contactPerson AS contactPerson',
          'venue.contactNumber AS contactNumber',
          'venue.zipCode AS zipCode',
          'venue.venueType As venueType',
          'venue.isPiqueVerified AS isPiqueVerified',
          'city.name AS city',
          'state.name AS state',
          'country.name AS country',
          'user.email AS email',
          'COALESCE(media.mediaDetails, "[]") AS media',
        ])

        .where('venue.id=:venueId', { venueId: venue.id })
        .setParameter('serverUri', this.config.get<string>('BASE_URL'))
        .getRawOne();

      const neighbourhood = await this.neighbourRepository.find({
        where: { venueId: venue.id },
      });
      const { media, isPiqueVerified, venueType, ...rest } = venueDetails;
      const response = {
        ...rest,
        media: media ? JSON.parse(media) : null,
        isPiqueVerified: isPiqueVerified === 1 ? true : false,
        neighbourhoods: neighbourhood,
        venueType:
          typeof venue.venueType === 'string'
            ? JSON.parse(venue.venueType) // stringified array
            : Array.isArray(venue.venueType)
              ? venue.venueType // already array
              : [],
      };
      return {
        message: 'user profile fetched successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEntertainerDetails(userId: number) {
    const URL = this.config.get<string>('DEFAULT_MEDIA');
    const ent = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

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
        .where('entertainer.id = :userId', {
          userId: ent.id,
        })
        .select([
          'entertainer.id AS id',
          'entertainer.name AS stageName',
          'entertainer.entertainer_name AS entertainerName',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'entertainer.isPiqueVerified AS isPiqueVerified',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.city AS city_code',
          'entertainer.state AS state_code',
          'entertainer.country AS country_code',
          'entertainer.zipCode AS zipCode',
          'entertainer.maxTravelDistanceMiles AS maxTravelDistance',
          'entertainer.services AS services',
          'entertainer.mediaLink AS mediaLink',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.contact_person AS contactPerson',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'entertainer.profileStep AS profileStep',
          'entertainer.isProfileComplete AS isProfileComplete',
          'entertainer.category AS category',
          'entertainer.timezone AS timezone',
          'entertainer.specific_category AS specific_category',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM entertainer_media m WHERE m.user_id= entertainer.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

      //  Getting Raw Categories
      const rawCategories = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id') // Category relation
        .where('ecs.entertainerId = :entertainerId', { entertainerId: ent.id })
        .select([
          'cat.id AS categoryId',
          'cat.name AS categoryName',
          'ecs.subcategoryIds AS subcategoryIds',
        ])
        .getRawMany();

      const subcategoryIds = rawCategories.flatMap((row) =>
        typeof row.subcategoryIds === 'string'
          ? row.subcategoryIds.split(',').map(Number)
          : [],
      );

      const uniqueSubcategoryIds = [...new Set(subcategoryIds)];

      //   Now get all the subcategory
      const subcategories = await this.categoryRepository.find({
        where: { id: In(uniqueSubcategoryIds) },
        select: ['id', 'name', 'catslug', 'parentId'],
      });

      const formatted = rawCategories.map((row) => {
        const subcatIds =
          typeof row.subcategoryIds === 'string'
            ? row.subcategoryIds.split(',').map(Number)
            : [];

        const specific_category = subcategories
          .filter((sub) => subcatIds.includes(sub.id))
          .map((sub) => ({
            id: sub.id,
            specificCategoryName: sub.name,
          }));

        return {
          id: row.categoryId,
          categoryName: row.categoryName,
          specific_category,
        };
      });

      const { socialLinks, services, id, isPiqueVerified, ...rest } =
        entertainer;

      const payload = {
        id: Number(id),
        services: services ? services.split(',') : [],
        isPiqueVerified: isPiqueVerified === 1 ? true : false,
        ...rest,
        socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
        categories: formatted,
      };

      return {
        message: 'user profile fetched successfully',
        status: true,
        data: payload,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
