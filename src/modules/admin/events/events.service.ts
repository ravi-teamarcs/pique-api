import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './Entity/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Injectable()
export class EventService {
    constructor(
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
    ) { }

    // Create a new event
    async create(createEventDto: CreateEventDto): Promise<Event> {
        const event = this.eventRepository.create(createEventDto);
        return this.eventRepository.save(event);
    }

    // Get all events
    async findAll({
        page,
        pageSize,
        search,
    }: {
        page: number;
        pageSize: number;
        search: string;
    }): Promise<{ records: Event[]; total: number }> {

        const skip = (page - 1) * pageSize; // Calculate records to skip

        const [records, total] = await this.eventRepository.findAndCount({
            where: {
                ...(search ? { title: Like(`%${search}%`) } : {})
            },
            //relations: ['event'], // Include the related `User` entity
            skip, // Pagination: records to skip
            take: pageSize, // Pagination: number of records per page
        });


        return {
            records, // Paginated entertainers
            total, // Total count of entertainers
        };
    }

    // Get a specific event by id
    async findOne(id: number): Promise<Event> {
        const event = await this.eventRepository
            .createQueryBuilder('event')
            .leftJoinAndSelect('venue', 'venue', 'venue.id = event.venueId') // Correctly join the venue table
            .select([
                'event.*', // Select all event fields
                'venue.*'
            ])
            .where('event.id = :id', { id })
            .getRawOne(); // Use getRawOne() for raw results




        if (!event) {
            throw new NotFoundException(`Event with id ${id} not found`);
        }
        return event;
    }

    // Update an event by id
    async update(id: number, createEventDto: CreateEventDto): Promise<Event> {
        const event = await this.findOne(id);
        Object.assign(event, createEventDto);
        return this.eventRepository.save(event);
    }

    // Delete an event by id
    async remove(id: number): Promise<void> {
        const event = await this.findOne(id);
        await this.eventRepository.remove(event);
    }


    //get booking using eventId

    async findBooking(eventId: number): Promise<any[]> {

        const bookings = await this.bookingRepository
            .createQueryBuilder('booking')
            .leftJoinAndSelect('entertainers', 'ent', 'ent.userId = booking.entertainerUserId') // Join Entertainers table using userId
            .leftJoinAndSelect('categories', 'cat', 'cat.id = ent.category') // Join categories table for main category
            .leftJoinAndSelect('categories', 'specific_cat', 'specific_cat.id = ent.specific_category') // Join categories table for specific category
            .select([
                'booking.*', // All booking fields
                'ent.*', // All columns from the entertainers table
                'cat.name AS categoryName', // Select the category name from the categories table
                'specific_cat.name AS specific_catName' // Select the specific category name from the categories table
            ])
            .where('booking.eventId = :eventId', { eventId })
            .getRawMany(); // Get raw results (not entity instances)

        return bookings;
    }



}
