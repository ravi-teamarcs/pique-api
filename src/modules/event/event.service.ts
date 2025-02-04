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
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);

    const savedEvent = await this.eventRepository.save(event);
    if (!savedEvent) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event };
  }

  async handleUpdateEvent(updateEventDto: UpdateEventDto, userId: number) {
    const { eventId, ...details } = updateEventDto;
    const event = await this.eventRepository.find({
      where: { id: eventId, userId: userId },
    });
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const updatedEvent = await this.eventRepository.update(
      { id: eventId },
      details,
    );

    if (updatedEvent.affected) {
      return { message: 'Event updated successfully' };
    }
  }
}
