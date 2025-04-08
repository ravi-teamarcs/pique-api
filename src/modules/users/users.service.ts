import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { instanceToPlain } from 'class-transformer';
import { Media } from '../media/entities/media.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
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
      status: 'active',
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
    const response = { message: 'Profile fetched Successfully', status: true };

    try {
      if (role === 'venue') {
        const details = await this.venueRepository
          .createQueryBuilder('venue')
          .leftJoinAndSelect('venue.user', 'user')
          .leftJoin('countries', 'country', 'country.id = venue.country')
          .leftJoin('cities', 'city', 'city.id = venue.city')
          .leftJoin('states', 'state', 'state.id = venue.state')
          .where('venue.user.id = :userId', { userId })
          // .andWhere('venue.isParent = :isParent', { isParent: 1})
          .select([
            'user.id AS uid',
            'user.name AS name',
            'user.email AS email',
            'user.phoneNumber AS phoneNumber',
            'user.role AS role',
            'venue.id AS vid',
            'venue.name AS vName',
            'venue.phone AS vPhone',
            'venue.email AS vEmail',
            'venue.addressLine1 As  vAddressLine1',
            'venue.addressLine2 As vAddressLine2',
            'venue.description AS vDescription',
            'venue.city As vCity',
            'venue.state As vState',
            'country.name AS country_name',
            'city.name AS city_name',
            'state.name AS state_name',
            'venue.zipCode AS vZipCode',
            'venue.country AS vCountry',
            'venue.isParent As isParent',
          ])
          .getRawOne();

        const newDetails = {
          ...details,
          isParent: Boolean(details.isParent),
        };

        const location = await this.venueRepository.find({
          where: { user: { id: userId }, isParent: false },
          select: [
            'id',
            'phone',
            'addressLine1',
            'addressLine2',
            'country',
            'zipCode',
            'city',
            'state',
            'country',
            'zipCode',
            'parentId',
            'isParent',
          ],
        });
        const rest = instanceToPlain(location);
        newDetails['locations'] = rest;
        response['data'] = newDetails;
        return response;
      }
      const URL = this.config.get<string>('DEFAULT_MEDIA');
      const entertainer = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('entertainer.user', 'user')
        .leftJoin(
          'media',
          'media',
          'media.userId = user.id AND media.type = :type',
          { type: 'headshot' },
        )
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin(
          'categories',
          'cat',
          'cat.id = entertainer.category AND cat.parentId = 0',
        )
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category AND subcat.parentId != 0',
        )
        .where('entertainer.user.id = :userId', { userId })
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
          `COALESCE(CONCAT(:baseUrl, media.url), :defaultMediaUrl) AS headshotUrl`,
        ])
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

      response['data'] = entertainer;
      return response;
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
