import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Venue } from './Entity/venue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto } from './Dto/create-venue.dto';
import { User } from '../users/Entity/users.entity';

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
      where: search ? { name: Like(`%${search}%`) } : {}, // Search by name
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return {
      records,
      total,
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
      throw new BadRequestException('Venue already exists for the user');
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

    console.log('field To Update', fieldsToUpdate, 'id', id);
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
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    await this.venueRepository.remove(venue); // Removes the venue from the repository
  }

  async searchEntertainers(query: string) {
    return this.venueRepository
      .createQueryBuilder('venue')
      .where('LOWER(venue.name) LIKE :query', {
        query: `%${query.toLowerCase()}%`,
      })
      .limit(10)
      .getMany();
  }
}
