import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';

import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { GetEventDto } from './dto/get-event.dto';
import { ConfigService } from '@nestjs/config';
import { UploadedFile } from 'src/common/types/media.type';
import { Media } from '../media/entities/media.entity';
import { MediaService } from '../media/media.service';
import { EventsQueryDto } from './dto/query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { format, parse } from 'date-fns';
import { Venue } from '../venue/entities/venue.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,

    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // Create a new event
  async create(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);
    const data = await this.eventRepository.save(event);
    return { message: 'Event Created Successfully', data: event, status: true };
  }

  // New code of Venue Creation with Media
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

    try {
      const event = this.eventRepository.create({
        sub_venue_id: neighbourhoodId,
        slug,
        ...rest,
      });

      await this.eventRepository.save(event);

      return {
        message: 'Event created Successfully',
        data: event,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }

  // Get all events
  async findAll({
    page,
    pageSize,
    search,
    status,
  }: {
    page: number;
    pageSize: number;
    search: string;
    status:
      | 'unpublished'
      | 'scheduled'
      | 'confirmed'
      | 'cancelled'
      | 'completed'
      | '';
  }): Promise<{
    message: string;
    records: Event[];
    total: number;
    status: boolean;
  }> {
    const skip = (page - 1) * pageSize; // Calculate records to skip

    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .select([
        // Event Details

        'event.id AS id',
        'event.title  AS title',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.status AS status',
        'event.eventDate  AS eventDate',
        'event.description  AS description',
        'event.slug  AS slug',

        'event.venueId AS venueId',
        'hood.name AS neighbourhood_name',
        'hood.name AS neighbourhood_name',
        'hood.contactPerson AS neighbourhood_contact_person',
        'hood.contactNumber AS neighbourhood_contact_number',
        'hood.id AS neighbourhood_id',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
      ])
      .where(search ? 'event.title LIKE :search' : '1=1', {
        search: `%${search}%`,
      });

    // ✅ Apply status filter only if it's a valid value
    if (status) {
      query.andWhere('event.status = :status', { status });
    }

    const totalCount = await query.getCount();
    const records = await query
      .orderBy('event.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getRawMany(); // ✅ Correct way to fetch raw selected fields

    return {
      message: 'Events fetched successfully',
      records,
      total: totalCount, // Paginated results
      status: true,
    };
  }

  // Get a specific event by id
  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .select([
        // Event Details

        'event.id AS id',
        'event.title  AS title',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.status AS status',
        'event.eventDate  AS eventDate',
        'event.description  AS description',
        'event.slug  AS slug',

        'event.venueId AS venueId',
        'hood.name AS neighbourhood_name',
        'hood.name AS neighbourhood_name',
        'hood.contactPerson AS neighbourhood_contact_person',
        'hood.contactNumber AS neighbourhood_contact_number',
        'hood.id AS neighbourhood_id',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
      ])

      .where('event.id = :id', { id })
      .getRawOne(); // Use getRawOne() for raw results

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  // Update an event by id
  async update(id: number, dto: UpdateEventDto) {
    const { neighbourhoodId, ...rest } = dto;
    const payload = { ...rest };
    if (neighbourhoodId) payload['sub_venue_id'] = neighbourhoodId;

    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new BadRequestException({
        message: 'Event not found',
        status: false,
      });
    }

    try {
      await this.eventRepository.update({ id: event.id }, payload);
      return { message: 'Event updated successfully', data: dto, status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // Delete an event by id
  async remove(id: number) {
    const event = await this.eventRepository.findOne({ where: { id } });
    await this.eventRepository.remove(event);
    return { message: 'Event deleted Successfully ', status: true };
  }

  //get booking using eventId

  async findBooking(eventId: number): Promise<any[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('entertainers', 'ent', 'ent.userId = booking.entId') // Join Entertainers table using userId
      .leftJoin('categories', 'cat', 'cat.id = ent.category') // Join categories table for main category
      .leftJoin(
        'categories',
        'specific_cat',
        'specific_cat.id = ent.specific_category',
      ) // Join categories table for specific category
      .select([
        'booking.*', // All booking fields
        'ent.*', // All columns from the entertainers table
        'cat.name AS categoryName', // Select the category name from the categories table
        'specific_cat.name AS specific_catName', // Select the specific category name from the categories table
      ])
      .where('booking.eventId = :eventId', { eventId })
      .getRawMany(); // Get raw results (not entity instances)

    return bookings;
  }

  async getUpcomingEvent(query: GetEventDto) {
    const { page = 1, pageSize = 10 } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    try {
      const URL =
        'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';
      const events = this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'event.venueId = venue.id')
        .leftJoin('media', 'media', 'event.id = media.eventId')
        .where('event.startTime > :now', { now: new Date() })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.slug  AS slug',
          'event.userId AS userId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
          'venue.id AS venue_id',
          'venue.name AS venue_name',
          `COALESCE(CONCAT(:baseUrl, media.url), :defaultMediaUrl) AS image_url`,
        ])
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .orderBy('event.startTime', 'ASC');

      const totalCount = await events.getCount();

      const results = await events
        .skip(Number(skip))
        .take(Number(pageSize))
        .getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: true,
      });
    }
  }

  async getEventDetailsByMonth(query: EventsQueryDto) {
    const {
      date = '', // e.g., '2025-04'
      page = 1,
      pageSize = 10,
      status = '',
    } = query;

    // If date is not provided, use current year and month
    const current = new Date();
    const year = date ? Number(date.split('-')[0]) : current.getFullYear();
    const month = date ? Number(date.split('-')[1]) : current.getMonth() + 1;

    const skip = (page - 1) * pageSize;

    try {
      const qb = this.eventRepository
        .createQueryBuilder('event')
        .andWhere('YEAR(event.startTime) = :year', { year })
        .andWhere('MONTH(event.startTime) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.userId AS userId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
        ])
        .orderBy('event.startTime', 'ASC');

      if (status) {
        qb.andWhere('event.status=:status', { status });
      }

      const totalCount = await qb.getCount();
      const results = await qb.skip(skip).take(pageSize).getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
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
