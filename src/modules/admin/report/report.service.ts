import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Event } from '../events/entities/event.entity';
import { Report } from './dto/report.dto';
@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Venue) private venueRepo: Repository<Venue>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Entertainer)
    private entertainerRepo: Repository<Entertainer>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
  ) {}

  async getAllEventData() {
    const page = 1;
    const skip = 10;

    const events = await this.eventRepo.find();
    const eventData = await Promise.all(
      events.map(async (event) => {
        const venue = await this.venueRepo.findOne({
          where: { id: event.venueId },
        });
        const bookings = await this.bookingRepo.find({
          where: { eventId: event.id },
          order: { id: 'DESC' },
        });

        const bookingsWithEntertainers = await Promise.all(
          bookings.map(async (booking) => {
            // Fetch the entertainer linked to the booking
            const entertainer = await this.entertainerRepo.findOne({
              where: { user: { id: booking.entertainerUser?.id } },
              relations: ['user'],
            });

            // Ensure that we only query invoices when an entertainer is found
            const invoices = entertainer
              ? await this.invoiceRepo.find({
                  where: { entertainer_id: entertainer.id },
                  order: { id: 'DESC' },
                })
              : [];

            return { ...booking, entertainer, invoices };
          }),
        );

        return {
          ...event,
          venue,
          bookings: bookingsWithEntertainers,
        };
      }),
    );

    return eventData;
  }

  async getEventData(query: Report) {
    const { page = 1, limit = 10, from, to } = query;
    console.log('Query Given', query);
    try {
      // Get current date
      const currentDate = new Date();

      let fromDate: Date, toDate: Date;

      if (from) {
        // Convert "YYYY-MM" to first second of that month (00:00:00)
        const [fromYear, fromMonth] = from.split('-').map(Number);
        fromDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0);

        console.log('fromDate tranformed', fromDate);
      } else {
        // Default: Start of last month if `from` is missing
        fromDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1,
          0,
          0,
          0,
        );
      }

      if (to) {
        // Convert "YYYY-MM" to last second of that month (23:59:59)
        const [toYear, toMonth] = to.split('-').map(Number);
        toDate = new Date(toYear, toMonth, 0, 23, 59, 59); // Last day of `to` month
        console.log('toDate transformed', toDate);
      } else {
        // Default: Current timestamp if `to` is missing
        toDate = new Date();
      }

      // Apply pagination
      const offset = (page - 1) * limit;

      console.log('Offset', offset);
      console.log('If not provided', fromDate, toDate);
      // Fetch the total count (for frontend pagination UI)
      const totalCount = await this.eventRepo
        .createQueryBuilder('event')
        .where('event.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .getCount();

      // Fetch events with linked data
      const eventsWithDetails = await this.eventRepo
        .createQueryBuilder('event')
        .select([
          // Event Table
          'event.id AS event_id',
          'event.title AS event_title',
          'event.location AS event_location',
          'event.userId AS event_userId',
          'event.venueId AS event_venueId',
          'event.description AS event_description',
          'event.startTime AS event_startTime',
          'event.endTime AS event_endTime',
          'event.recurring AS event_recurring',
          'event.status AS event_status',

          // Venue Table
          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine1 AS venue_addressLine2',

          // Booking Table
          'booking.id AS booking_id',
          'booking.status AS booking_status',

          'booking.entertainerUserId AS booking_entertainerUserId',

          // Entertainer Table
          'entertainer.id AS entertainer_id',
          'entertainer.name AS entertainer_name',
          'entertainer.bio AS entertainer_bio',

          // User Table

          // Invoice Table
          'invoice.id AS invoice_id',
          'invoice.total_with_tax AS total_amount',
          'invoice.status AS invoice_status',
          'invoice.invoice_number AS invoice_number',
        ])
        .where('event.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('event.status = :status', { status: 'completed' })
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('booking', 'booking', 'booking.eventId = event.id')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.userId = booking.entertainerUserId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin(
          'invoices',
          'invoice',
          'invoice.entertainer_id = entertainer.id',
        )
        .orderBy('event.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getRawMany();

      return {
        data: eventsWithDetails,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error getting event Data',
        error: error.message,
        status: false,
      });
    }
  }
}
