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
import { format, parse } from 'date-fns';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  async createEvent(dto: CreateEventDto) {
    const { neighbourhoodId, ...rest } = dto;

    const obj = structuredClone(dto);

    const { title, venueId, eventDate, startTime } = obj;

    const date = new Date(eventDate);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const parsedTime = parse(startTime, 'HH:mm', new Date());
    const time12 = format(parsedTime, 'h:mm a');
    const { name, neighbourhoodName, addressLine1, addressLine2 } =
      await this.venueRepository
        .createQueryBuilder('venue')
        .leftJoin('neighbourhood', 'hood', 'hood.id = :neighbourhoodId', {
          neighbourhoodId,
        })
        .select([
          'venue.id AS id',
          'venue.name AS name',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'hood.name AS neighbourhoodName',
          'hood.contactPerson AS neighbourhood_contact_person',
          'hood.contactNumber AS neighbourhood_contact_number',
        ])
        .where('venue.id = :id', { id: venueId })
        .getRawOne();

    const slug = `${formattedDate} at ${time12} (${title}) at ${neighbourhoodName}/${name} at ${addressLine1} ${addressLine2}`;
    const event = this.eventRepository.create({
      sub_venue_id: neighbourhoodId,
      slug,
      ...rest,
    });

    const savedEvent = await this.eventRepository.save(event);
    if (!savedEvent) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event, status: true };
  }

  async handleUpdateEvent(updateEventDto: any, venueId: number) {
    const { eventId, ...details } = updateEventDto;
    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
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
  // Created for venues
  async getAllEvents(id: number) {
    const [events, totalCount] = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.venueId =:id', { id })
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
        'event.slug',
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
  // Api Working
  async deleteEvent(venueId: number, eventId: number) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
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
