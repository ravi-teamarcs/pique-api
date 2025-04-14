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

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
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
    const skip = (page - 1) * pageSize; // Calculate records to skip
    const [records, total] = await this.venueRepository.findAndCount({
      where: {
        isParent: true,
        ...(search ? { name: Like(`%${search}%`) } : {}), // Search by name if provided
      },
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return {
      records,
      total,
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
    const { userId, ...venueData } = createVenueDto;
    const alreadyExists = await this.venueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (alreadyExists) {
      throw new BadRequestException({
        message: 'Venue Already exists for the User',
        status: false,
      });
    }
    const venue = this.venueRepository.create({
      ...venueData,
      user: { id: userId },
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

  async getVenueLocation(id: number) {}
}
