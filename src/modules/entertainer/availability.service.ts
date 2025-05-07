import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfigService } from '@nestjs/config';
import { UnavailableDate } from './entities/unavailable.entity';
import { EntertainerAvailability } from './entities/availability.entity';
import { CreateEntertainerAvailabilityDto } from './dto/entertainer-availability-dto';



@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(EntertainerAvailability)
    private readonly EntertainerAvailability: Repository<EntertainerAvailability>,
    @InjectRepository(UnavailableDate)
    private readonly unavailabilityRepo: Repository<UnavailableDate>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateEntertainerAvailabilityDto) {
    const availability = this.EntertainerAvailability.create(dto);
    return this.EntertainerAvailability.save(availability);
  }
  async findByEntertainerId(entertainer_id: number) {
    return this.EntertainerAvailability.find({ where: { entertainer_id } });
  }
}
