import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EntertainerAvailability } from './entities/availability.entity';
import { UpdateAvailabilityDto } from './dto/update-entertainer-availability.dto';
import { EntertainerAvailabilityDto } from '../admin/entertainer/Dto/entertainer-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    private readonly config: ConfigService,
  ) {}

  async getEntertainerAvailability(id: number, year: number, month: number) {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { entertainer_id: id, year, month },
      });

      return {
        message: 'Entertainer Availability returned Successfully',
        data: availability,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async saveEntertainerAvailability(dto: EntertainerAvailabilityDto) {
    try {
      const { entertainer_id, ...rest } = dto;

      const alreadyExists = await this.availabilityRepository.findOne({
        where: { entertainer_id, year: dto.year, month: dto.month },
      });

      if (alreadyExists) {
        await this.availabilityRepository.update(
          { id: alreadyExists.id },
          { ...rest },
        );
      }

      const availability = this.availabilityRepository.create(dto);
      const savedAvailability =
        await this.availabilityRepository.save(availability);
      return {
        message: 'Entertainer Availability returned Successfully',
        data: savedAvailability,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // async getEntertainerAvailability(id: number, year: number, month: number) {
  //   try {
  //     const availability = await this.availabilityRepository.findOne({
  //       where: { entertainer_id: id, year, month },
  //     });

  //     return {
  //       message: 'Entertainer Availability returned Successfully',
  //       data: availability,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: error.message,
  //       status: false,
  //     });
  //   }
  // }

  async updateEntertainerAvailability(id: number, dto: UpdateAvailabilityDto) {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { entertainer_id: id, year: dto.year, month: dto.month },
      });

      if (!availability) {
        throw new BadRequestException({ message: 'Availability not found' });
      }

      const updatedAvailability = await this.availabilityRepository.update(
        { id: availability.id },
        dto,
      );
      return {
        message: 'Entertainer Availability updated Successfully',
        data: dto,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
