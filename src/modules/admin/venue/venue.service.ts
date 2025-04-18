import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Venue } from './entities/venue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto } from './Dto/create-venue.dto';
import { User } from '../users/entities/users.entity';
import { AddLocationDto } from './Dto/add-location.dto';
import { UpdateLocationDto } from './Dto/update-location.dto';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { CreateNeighbourhoodDto } from './Dto/create-neighbourhood.dto';
import { UpdateNeighbourhoodDto } from './Dto/update-neighbourhood';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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

    const queryBuilder = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .where('venue.isParent = :isParent', { isParent: true }) // filter isParent = true
      .orderBy('venue.id', 'DESC')
      .skip(skip)
      .take(pageSize);

    if (search) {
      queryBuilder.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const records = await queryBuilder
      .select([
        // Customize this select as needed
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.zipCode AS zipCode',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
      ])
      .getRawMany();

    const countQuery = this.venueRepository
      .createQueryBuilder('venue')
      .where('venue.isParent = :isParent', { isParent: true });

    if (search) {
      countQuery.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const total = await countQuery.getCount();

    return {
      records,
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

  async createVenue(createVenueDto: CreateVenueDto): Promise<Venue> {
    const { ...venueData } = createVenueDto;
    const venue = this.venueRepository.create({
      ...venueData,
      isParent: true,
    });

    await this.venueRepository.save(venue);

    return venue;
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

  async removeNeighbourhood(id: number) {
    const result = await this.neighbourRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Neighbourhood not found');
    }
    return { message: 'Neighbourhood deleted successfully', status: true };
  }
}
