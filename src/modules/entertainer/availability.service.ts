import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EntertainerAvailability } from './entities/availability.entity';
import { UpdateAvailabilityDto } from './dto/update-entertainer-availability.dto';
import { EntertainerAvailabilityDto } from '../admin/entertainer/Dto/entertainer-availability.dto';
import { Booking } from '../booking/entities/booking.entity';
import { endOfMonth, startOfMonth } from 'date-fns';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly config: ConfigService,
  ) {}

  async getEntertainerAvailability(id: number, year: number, month: number) {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { entertainer_id: id, year, month },
        select: [
          'id',
          'entertainer_id',
          'unavailable_dates',
          'available_dates',
          'unavailable_weekdays',
          'year',
          'month',
        ],
      });

      const startDate = startOfMonth(new Date(year, month - 1)); // May 1, 2025
      const endDate = endOfMonth(new Date(year, month - 1)); // May 31, 2025

      const bookingHistory = await this.bookingRepository.find({
        where: {
          entId: id,
          showDate: Between(startDate, endDate),
        },
        select: ['showDate'],
      });
      availability['alradyBookedFor'] = bookingHistory;
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

        return {
          message: 'Entertainer Availability updated Successfully',
          status: true,
        };
      }

      const availability = this.availabilityRepository.create(dto);
      const savedAvailability =
        await this.availabilityRepository.save(availability);

      return {
        message: 'Entertainer Availability saved Successfully',
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
