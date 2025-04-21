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

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
  ) {}

  // async getAllVenue({
  //   page,
  //   pageSize,
  //   search,
  // }: {
  //   page: number;
  //   pageSize: number;
  //   search: string;
  // }) {
  //   const skip = (page - 1) * pageSize;

  //   const queryBuilder = this.venueRepository
  //     .createQueryBuilder('venue')
  //     .leftJoin('cities', 'city', 'city.id = venue.city')
  //     .leftJoin('states', 'state', 'state.id = venue.state')
  //     .leftJoin('countries', 'country', 'country.id = venue.country')
  //     .leftJoin('neighbourhood', 'hood', 'hood.venue_id = venue.id')
  //     .orderBy('venue.id', 'DESC')
  //     .skip(skip)
  //     .take(pageSize);

  //   if (search) {
  //     queryBuilder.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
  //       search: `%${search}%`,
  //     });
  //   }

  //   const records = await queryBuilder
  //     .select([
  //       // Customize this select as needed
  //       'venue.name AS name',
  //       'venue.addressLine1 AS addressLine1',
  //       'venue.addressLine2 AS addressLine2',
  //       'venue.zipCode AS zipCode',
  //       'city.name AS city',
  //       'state.name AS state',
  //       'country.name AS country',
  //       'hood.name AS name',
  //       'hood.contactPerson AS contactPerson',
  //       'hood.contactNumber AS contactNumber',
  //     ])
  //     .getRawMany();

  //   const countQuery = this.venueRepository.createQueryBuilder('venue');

  //   if (search) {
  //     countQuery.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
  //       search: `%${search}%`,
  //     });
  //   }

  //   const total = await countQuery.getCount();

  //   return {
  //     records,
  //     total,
  //     page,
  //     pageSize,
  //     pageCount: Math.ceil(total / pageSize),
  //   };
  // }

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

    const queryBuilder = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin('neighbourhood', 'hood', 'hood.venue_id = venue.id')
      .select([
        'venue.id AS id',
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.zipCode AS zipCode',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'hood.name AS hoodName',
        'hood.contactPerson AS contactPerson',
        'hood.contactNumber AS contactNumber',
        'COUNT(*) OVER() AS total',
      ])
      .orderBy('venue.id', 'DESC')
      .skip(skip)
      .take(pageSize);

    if (search) {
      queryBuilder.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const rawRecords = await queryBuilder.getRawMany();
    const total = rawRecords[0]?.total ? Number(rawRecords[0].total) : 0;
    console.log('Raw Record', rawRecords);
    return {
      records: rawRecords.map((row) => ({
        id: row.id,
        name: row.name,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        zipCode: row.zipCode,
        city: row.city,
        state: row.state,
        country: row.country,
        neighbourhoodName: row.hoodName,
        contactPerson: row.contactPerson,
        contactNumber: row.contactNumber,
      })),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
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

  async getVenueByUserId(userId) {
    const records = await this.venueRepository.find({
      where: {
        user: { id: userId },
      },
      //relations: ['users'],
    });
    //console.log(records);
    return {
      records,
      total: records.length,
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

  async updateVenue(updateVenueDto: UpdateVenueDto) {
    const { id, fieldsToUpdate } = updateVenueDto;

    const venue = await this.venueRepository.findOne({ where: { id } });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    await this.venueRepository.update({ id }, fieldsToUpdate);

    return { message: 'Venue updated successfully', status: true };
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
