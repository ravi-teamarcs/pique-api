import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyAvailability } from './entities/weekly-availability.entity';
import { ConfigService } from '@nestjs/config';
import { UnavailableDate } from './entities/unavailable.entitiy';
import { TimeSlotDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(WeeklyAvailability)
    private weeklyRepo: Repository<WeeklyAvailability>,
    @InjectRepository(UnavailableDate)
    private unavailableRepo: Repository<UnavailableDate>,
    private readonly config: ConfigService,
  ) {}

  // Setting Avaialbility Dates
  async setWeeklyAvailability(userId: number, weekly) {
    try {
      await this.weeklyRepo.delete({ user: userId });
      const entries = weekly.map((w) =>
        this.weeklyRepo.create({ user: userId, ...w }),
      );
      await this.weeklyRepo.save(entries);
      return {
        message: 'Weekly availability set successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // Setting Unavailable Dates
  async setUnavailableDates(userId: number, dates) {
    try {
      await this.unavailableRepo.delete({ user: userId });
      const entries = dates.map((date) =>
        this.unavailableRepo.create({ user: userId, date }),
      );
      await this.unavailableRepo.save(entries);

      return {
        message: 'Unavailable dates set successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  //   async getAvailabilityForDate(userId: number, date: string) {
  //     const isUnavailable = await this.unavailableRepo.findOne({
  //       where: { user: { id: userId }, date },
  //     });
  //     if (isUnavailable) return [];

  //     const custom = await this.customRepo.find({
  //       where: { user: { id: userId }, date },
  //     });
  //     if (custom.length) return custom;

  //     const day = new Date(date)
  //       .toLocaleDateString('en-US', { weekday: 'long' })
  //       .toLowerCase();
  //     return this.weeklyRepo.find({
  //       where: { user: { id: userId }, dayOfWeek: day },
  //     });
  //   }
}
