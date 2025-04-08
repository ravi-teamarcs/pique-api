import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyAvailability } from './entities/weekly-availability.entity';
import { ConfigService } from '@nestjs/config';
import { UnavailableDate } from './entities/unavailable.entity';
import { SetAvailabilityDto, TimeSlotDto } from './dto/set-availability.dto';
import { UnavailableDateDto } from './dto/unavailable.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(WeeklyAvailability)
    private readonly availabilityRepo: Repository<WeeklyAvailability>,
    @InjectRepository(UnavailableDate)
    private readonly unavailabilityRepo: Repository<UnavailableDate>,
    private readonly config: ConfigService,
  ) {}

  async setAvailabilityAndUnavailability(
    userId: number,
    availabilityDto: SetAvailabilityDto,
    unavailabilityDto?: UnavailableDateDto,
  ) {
    // Remove existing entries
    try {
      await this.availabilityRepo.delete({ user: userId });

      if (unavailabilityDto?.dates?.length) {
        await this.unavailabilityRepo.delete({ user: userId });
      }

      // Save availability slots
      const availabilityEntities = availabilityDto.slots.map((slot) =>
        this.availabilityRepo.create({
          user: userId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      );
      await this.availabilityRepo.save(availabilityEntities);

      // Save unavailability dates
      if (unavailabilityDto?.dates?.length) {
        const unavailabilityEntities = unavailabilityDto.dates.map((date) =>
          this.unavailabilityRepo.create({
            user: userId,
            date,
          }),
        );
        await this.unavailabilityRepo.save(unavailabilityEntities);
      }

      return {
        message: 'Availability and unavailability updated successfully',
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
