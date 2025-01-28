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
    const { userId, ...details } = createEventDto;
    const event = this.eventRepository.create({
      user: { id: userId },
      ...details,
    });

    const savedEvent = await this.eventRepository.save(event);
    if (savedEvent) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event };
  }

  async handleUpdateEvent() {
    //   const event = await this.eventRepository.find({ where: user:{ id: userId } });
    // const { userId, ...details } = updateEventDto;
    // //
    // const event = await this.eventRepository.find({
    //   where: { user: { id: userId } },
    // });
    //  if (!event) {
    //     throw new BadRequestException('Event not found');
    //   }

    //   // Send email reminder to event organizer
    //   // 1. Entertainer , Admin , venue
  }
}
