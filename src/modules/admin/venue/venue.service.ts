import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Venue } from './entities/venue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto, CreateVenueRequestDto } from './Dto/create-venue.dto';
import { User } from '../users/entities/users.entity';
import { AddLocationDto } from './Dto/add-location.dto';
import { UpdateLocationDto } from './Dto/update-location.dto';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { CreateNeighbourhoodDto } from './Dto/create-neighbourhood.dto';
import { UpdateNeighbourhoodDto } from './Dto/update-neighbourhood';
import { MediaService } from '../media/media.service';
import { UploadedFile } from 'src/common/types/media.type';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AdminCreatedUser } from '../users/entities/admin.created.entity';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AdminCreatedUser)
    private readonly tempRepository: Repository<AdminCreatedUser>,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
  ) {}

  async getAllVenue({
    page,
    pageSize,
    search,
  }: {
    page: number;
    pageSize: number;
    search: string;
  }) {
    const skip = (page - 1) * pageSize;

    const res = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.user', 'user')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS media_user_id',
              `JSON_ARRAYAGG(
            JSON_OBJECT(
              "url", CONCAT(:serverUri, media.url),
              "type", media.type,
              "id", media.id
            )
          ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media',
        'media.media_user_id = venue.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'neighbourhood.venueId AS nh_venue_id',
              `JSON_ARRAYAGG(
            JSON_OBJECT(
              "id", neighbourhood.id,
              "name", neighbourhood.name,
              "contactPerson", neighbourhood.contact_person,
              "contactNumber", neighbourhood.contact_number
            )
          ) AS neighbourhoodDetails`,
            ])
            .from('neighbourhood', 'neighbourhood')
            .groupBy('neighbourhood.venueId'),
        'neighbourhoods',
        'neighbourhoods.nh_venue_id = venue.id',
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
        'venue.zipCode AS zipCode',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'user.status AS status',
        'COALESCE(media.mediaDetails, "[]") AS media',
        'COALESCE(neighbourhoods.neighbourhoodDetails, "[]") AS neighbourhoods',
      ])
      .orderBy('venue.id', 'DESC')
      .setParameter('serverUri', this.config.get<string>('BASE_URL'));

    if (search) {
      res.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const totalCount = await res.getCount();

    // Paginate
    const venues = await res.skip(skip).take(pageSize).getRawMany();
    const parsedVenues = venues.map((v) => ({
      ...v,
      media: JSON.parse(v.media),
      neighbourhoods: JSON.parse(v.neighbourhoods),
    }));

    return {
      message: 'Venue Details fetched Successfully',
      records: parsedVenues,
      total: totalCount,
      page,
      pageSize,
      pageCount: Math.ceil(totalCount / pageSize),
    };
  }

  async getAllVenuesDropdown() {
    const venues = await this.venueRepository.find({
      where: { isParent: true },
    });
    return {
      message: 'venues returned Successfully',
      records: venues,
      status: true,
    };
  }

  async getVenueByUserId(venueId: number) {
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
        'venue.zipCode AS zipCode',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'user.id AS user_id',
        'user.createdByAdmin AS createdByAdmin',
        'COALESCE(media.mediaDetails, "[]") AS media',
      ])

      .where('venue.id=:venueId', { venueId })
      .setParameter('serverUri', this.config.get<string>('BASE_URL'))
      .getRawOne();

    const neighbourhood = await this.neighbourRepository.find({
      where: { venueId },
    });
    const password = null;
    if (venueDetails.createdByAdmin === 1) {
      const data = await this.tempRepository.findOne({
        where: { email: venueDetails.email },
      });
      venueDetails['password'] = data?.password;
    }

    const { media, createdByAdmin, ...rest } = venueDetails;
    const response = {
      ...rest,
      createdByAdmin: createdByAdmin === 0 ? false : true,
      media: JSON.parse(media),
      neighbourhoods: neighbourhood,
    };

    return {
      message: 'Venue Details fetched Successfully',
      data: response,
      status: true,
    };
  }

  async createVenue(dto: CreateVenueRequestDto, uploadedFiles: UploadedFile[]) {
    const { createLogin, user, venue, neighbourhood } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let savedUser = null;

      // 1. Create user if checkbox is checked
      if (createLogin) {
        const { password, ...rest } = user;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.userRepository.create({
          ...rest,
          password: hashedPassword,
          isVerified: true,
          createdByAdmin: true,
        });
        savedUser = await queryRunner.manager.save(newUser);
        // saving password in temp repo
        const temp = this.tempRepository.create({
          email: savedUser.email,
          password,
        });
        await this.tempRepository.save(temp);
      }

      // 2. Create venue with reference to user (if present)
      const newVenue = this.venueRepository.create({
        ...venue,
        user: savedUser ? { id: savedUser.id } : null,
        profileStep: 3,
        isProfileComplete: true,
      });
      const savedVenue = await queryRunner.manager.save(newVenue);

      // 3. Upload media (pass queryRunner to use same transaction if saving to DB)
      if (neighbourhood && neighbourhood.length > 0) {
        const neighbourhoods = neighbourhood.map((item) =>
          this.neighbourRepository.create({
            ...item,
            venueId: savedVenue.id, // ensure this is included
          }),
        );
        await queryRunner.manager.save(neighbourhoods);
      }

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleMediaUpload(savedVenue.id, uploadedFiles);
      }
      await queryRunner.commitTransaction();

      return {
        message: 'Venue Created Successfully with media .',
        status: true,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        message: error.mesage,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async updateVenue(
    dto: UpdateVenueDto,
    venueId: number,
    uploadedFiles: UploadedFile[] = [],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { user, createLogin } = dto;
    try {
      const venue = await queryRunner.manager.findOne(Venue, {
        where: { id: venueId },
        relations: ['user'],
      });
      console.log('venue during update', venue);
      if (!venue) {
        throw new NotFoundException({
          message: 'Venue Not Found',
          status: false,
        });
      }

      const userId = venue?.user ? venue.user.id : null;
      const alreadyHaveLoginCredentials = venue?.user ? true : false;

      if (createLogin) {
        if (alreadyHaveLoginCredentials) {
          // If already have login credentials then update them.
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await this.userRepository.update(
            { id: userId },
            { email: user.email, password: hashedPassword },
          );
          await this.tempRepository.update(
            { email: venue.user.email },
            { email: user.email, password: user.password },
          );
        } else {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          const newUser = this.userRepository.create({
            email: user.email,
            password: hashedPassword,
            isVerified: true,
            createdByAdmin: true,
            role: 'venue',
          });
          const savedUser = await this.userRepository.save(newUser);
          await this.venueRepository.update(
            { id: venue.id },
            { user: { id: savedUser.id } },
          );
        }
      }

      await queryRunner.manager.update(Venue, { id: venue.id }, dto.venue);

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleMediaUpload(venue.id, uploadedFiles);
      }
      await queryRunner.commitTransaction();
      return { message: 'Venue updated with media Sucessfully ', status: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async deleteVenue(id: number): Promise<any> {
    const venue = await this.venueRepository.findOne({ where: { id } });

    if (!venue) {
      throw new NotFoundException({
        message: `Venue with ID ${id} not found`,
        status: false,
      });
    }

    await this.venueRepository.remove(venue); // Removes the venue from the repository

    return { message: 'Venue deleted successfully', status: true };
  }

  async searchEntertainers(query: string) {
    return await this.venueRepository.find({
      where: { isParent: true },
    });
  }

  async addVenueLocation(locDto: AddLocationDto) {
    const { venueId, ...rest } = locDto;
    const parentVenue = await this.venueRepository.findOne({
      where: { id: venueId, isParent: true },
      relations: ['user'],
    });

    if (!parentVenue) {
      throw new BadRequestException({
        message: 'Can not Add venue Location',
        status: false,
        error: 'Parent venue do not exists',
      });
    }

    const venueLoc = this.venueRepository.create({
      ...rest,
      name: parentVenue.name,
      user: { id: parentVenue.user.id },
      description: parentVenue.description,
      parentId: parentVenue.id,
      isParent: false,
    });

    await this.venueRepository.save(venueLoc);

    try {
      return { message: 'Location Added Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error Adding Location',
        status: false,
      });
    }
  }

  async updateLocation(id: number, dto: UpdateLocationDto) {
    const venueExists = await this.venueRepository.findOne({
      where: { id, isParent: false },
    });
    if (!venueExists) {
      throw new NotFoundException({
        message: 'Location not Found',
        status: false,
      });
    }

    try {
      await this.venueRepository.update({ id: venueExists.id }, dto);
      return {
        message: 'Location updatesd Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async removeLocation(id: number) {
    const venueExists = await this.venueRepository.findOne({
      where: { id, isParent: false },
    });
    if (!venueExists) {
      throw new NotFoundException({
        message: 'Location not Found',
        status: false,
      });
    }
    try {
      await this.venueRepository.remove(venueExists);
      return {
        message: 'Location removed Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  // Creation Logic Neighbourhood
  async create(dto: CreateNeighbourhoodDto) {
    const neighbourhood = this.neighbourRepository.create(dto);
    await this.neighbourRepository.save(neighbourhood);
    return { message: 'Neighbourhood added successfully', status: true };
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
}
