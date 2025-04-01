import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // Create a new event
  async create(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);
    const data = await this.eventRepository.save(event);
    console.log('Data', data);
    return { message: 'Event Creates Successfully', data: event, status: true };
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

    console.log('Status:', status);

    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId') // Explicit join on venue
      .select([
        'event.id AS id',
        'event.title  AS title',
        'event.location  AS location',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.status AS status',
        'event.recurring  AS recurring',
        'event.description  AS description',
        'event.venueId AS venueId',
        'event.userId AS userId',
        'event.isAdmin AS isAdmin',
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
      .leftJoinAndSelect('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('users', 'user', 'user.id = event.userId ')
      .select([
        'user.id AS uid',
        'user.name AS username',
        'user.phoneNumber as phoneNumber',
        'event.id AS eid',
        'event.title AS ename',
        'event.location AS location',

        'event.description AS description',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.recurring AS recurring',
        'event.status AS status',
        'event.isAdmin As isAdmin', // Select all event fields
        'venue.id As vid',
        'venue.name AS vname',
        'addressLine1 As addressLine1',
        'addressLine2 As addressLine2',
        'zipCode AS zipCode',
      ])
      .where('event.id = :id', { id })
      .getRawOne(); // Use getRawOne() for raw results

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  // Update an event by id
  async update(id: number, dto: CreateEventDto) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new BadRequestException({
        message: 'Event not found',
        status: false,
      });
    }

    try {
      await this.eventRepository.update({ id: event.id }, dto); // Update event with provided data
      return { message: 'Event updated successfully', status: true };
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
      .leftJoinAndSelect(
        'entertainers',
        'ent',
        'ent.userId = booking.entertainerUserId',
      ) // Join Entertainers table using userId
      .leftJoinAndSelect('categories', 'cat', 'cat.id = ent.category') // Join categories table for main category
      .leftJoinAndSelect(
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
}
