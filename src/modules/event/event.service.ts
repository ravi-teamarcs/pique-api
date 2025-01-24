import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { VenueEvent } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    const { venueId, ...details } = createEventDto;
    const event = this.eventRepository.create({
      // venue:{ id:venueId },
      // details,
    });
    if (!this.eventRepository.save(event)) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event };
  }

  async sendEventReminder() {
    const event = await this.eventRepository.find({ where: { id: 1 } });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Send email reminder to event organizer
    // 1. Entertainer , Admin , venue
  }
}
