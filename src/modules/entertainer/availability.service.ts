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
import { instanceToPlain } from 'class-transformer';

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
      let data: Record<string, any> = {};
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
      if (availability) availability['alreadyBookedFor'] = bookingHistory;
      else {
        data['alreadyBookedFor'] = bookingHistory;
      }
      return {
        message: 'Entertainer Availability returned Successfully',
        data: availability ?? data,
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
      const plaindto = instanceToPlain(dto);

      const { entertainer_id, ...rest } = plaindto;

      const alreadyExists = await this.availabilityRepository.findOne({
        where: { entertainer_id, year: plaindto.year, month: plaindto.month },
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

  async entertainerAvailability(id: number, year: number, month: number) {
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

  // async updateEntertainerAvailability(id: number, dto: UpdateAvailabilityDto) {
  //   try {
  //     const plaindto = instanceToPlain(dto);
  //     const availability = await this.availabilityRepository.findOne({
  //       where: {
  //         entertainer_id: id,
  //         year: plaindto.year,
  //         month: plaindto.month,
  //       },
  //     });

  //     if (!availability) {
  //       throw new BadRequestException({ message: 'Availability not found' });
  //     }

  //     const updatedAvailability = await this.availabilityRepository.update(
  //       { id: availability.id },
  //       plaindto,
  //     );
  //     return {
  //       message: 'Entertainer Availability updated Successfully',
  //       data: dto,
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
      const plainDto = instanceToPlain(dto);
      const availability = await this.availabilityRepository.findOne({
        where: {
          entertainer_id: id,
          year: plainDto.year,
          month: plainDto.month,
        },
      });

      if (!availability) {
        const avail = this.availabilityRepository.create({
          entertainer_id: id,
          ...plainDto,
        });
        const savedAvailability = await this.availabilityRepository.save(avail);
        return {
          message: 'Entertainer availability Saved successfully',
          data: savedAvailability,
          status: true,
        };
      }

      const updatedAvailability = await this.availabilityRepository.update(
        { id: availability.id },
        plainDto,
      );
      return {
        message: 'Entertainer availability updated successfully',
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
