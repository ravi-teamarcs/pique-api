import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { VenueEvent } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Venue } from '../venue/entities/venue.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
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

    try {
      await this.eventRepository.update(
        { id: eventId },
        {
          ...details,
        },
      );

      return { message: 'Event updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error updating event',
        error: error.message,
        status: error.status,
      });
    }
  }

  async getAllEvents(userId: number) {
    const [events, totalCount] = await this.eventRepository
      .createQueryBuilder('event')
      .where(
        'event.venueId IN ' +
          `(SELECT venue.id FROM venue WHERE venue.userId = :userId)`,
        { userId },
      )
      .andWhere('event.startTime > :now', { now: new Date() })
      .orderBy('event.startTime', 'ASC')
      .select([
        'event.id',
        'event.title',
        'event.location',
        'event.userId',
        'event.venueId',
        'event.description',
        'event.startTime',
        'event.endTime',
        'event.recurring',
        'event.status',
        'event.isAdmin',
      ])
      .getManyAndCount();
    return {
      message: 'Events fetched successfully',
      count: totalCount,
      data: events,
      status: true,
    };
  }

  async deleteEvent(userId: number, eventId: number) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, userId: userId },
    });
    if (!event) {
      throw new BadRequestException({
        message: 'Event not found',
        status: false,
      });
    }
    try {
      await this.eventRepository.remove(event);
      return { message: 'Event deleted successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error deleting event',
        error: error.message,
        status: false,
      });
    }
  }
}
