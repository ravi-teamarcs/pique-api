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

  async createEvent(createEventDto: CreateEventDto, userId: number) {
    const event = this.eventRepository.create({ userId, ...createEventDto });

    const savedEvent = await this.eventRepository.save(event);
    if (!savedEvent) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event, status: true };
  }

  async handleUpdateEvent(updateEventDto: UpdateEventDto, userId: number) {
    const { eventId, ...details } = updateEventDto;
    const event = await this.eventRepository.findOne({
      where: { id: eventId, userId: userId },
    });
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const updatedEvent = await this.eventRepository.update(
      { id: eventId },
      {
        ...details,
      },
    );

    if (updatedEvent.affected) {
      return { message: 'Event updated successfully', status: true };
    }
  }

  async getAllEvents(userId: number) {
    const events = await this.eventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'title',
        'location',
        'userId',
        'venueId',
        'description',
        'startTime',
        'endTime',
        'recurring',
        'status',
        'isAdmin',
      ],
    });

    return {
      message: 'Events fetched successfully',
      count: events.length,
      data: events,
      status: true,
    };
  }
}
