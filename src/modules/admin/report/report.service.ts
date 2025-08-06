import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Event } from '../events/entities/event.entity';
import { Report } from './dto/report.dto';
import { DownloadReport } from './dto/generate-report.dto';
import * as stream from 'stream';

import { Response } from 'express';

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

  // async getAllEventData() {
  //   const page = 1;
  //   const skip = 10;

  //   const events = await this.eventRepo.find();
  //   const eventData = await Promise.all(
  //     events.map(async (event) => {
  //       const venue = await this.venueRepo.findOne({
  //         where: { id: event.venueId },
  //       });
  //       const bookings = await this.bookingRepo.find({
  //         where: { eventId: event.id },
  //         order: { id: 'DESC' },
  //       });

  //       const bookingsWithEntertainers = await Promise.all(
  //         bookings.map(async (booking) => {
  //           // Fetch the entertainer linked to the booking
  //           const entertainer = await this.entertainerRepo.findOne({
  //             where: { user: { id: booking.entertainerUser?.id } },
  //             relations: ['user'],
  //           });

  //           // Ensure that we only query invoices when an entertainer is found
  //           const invoices = entertainer
  //             ? await this.invoiceRepo.find({
  //                 where: { entertainer_id: entertainer.id },
  //                 order: { id: 'DESC' },
  //               })
  //             : [];

  //           return { ...booking, entertainer, invoices };
  //         }),
  //       );

  //       return {
  //         ...event,
  //         venue,
  //         bookings: bookingsWithEntertainers,
  //       };
  //     }),
  //   );

  //   return eventData;
  // }

  async getEventData(query: Report) {
    const { page = 1, limit = 10, from, to, search = '' } = query;

    try {
      const currentDate = new Date();

      let fromDate: Date, toDate: Date;

      if (from) {
        const [fromYear, fromMonth] = from.split('-').map(Number);
        fromDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0);
      } else {
        // Default: First day of the current month
        fromDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
          0,
          0,
          0,
        );
      }

      if (to) {
        const [toYear, toMonth] = to.split('-').map(Number);

        if (
          toYear === currentDate.getFullYear() &&
          toMonth === currentDate.getMonth() + 1
        ) {
          // If the `to` month is the current month, return data only until today
          toDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23,
            59,
            59,
          );
        } else {
          // Otherwise, return the last day of the selected `to` month
          toDate = new Date(toYear, toMonth, 0, 23, 59, 59);
        }
      } else {
        // Default: Current date (today)
        toDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          23,
          59,
          59,
        );
      }

      const take = (page - 1) * limit;

      const res = this.eventRepo
        .createQueryBuilder('event')
        .select([
          'event.id AS event_id',
          'event.title AS event_title',
          'event.location AS event_location',
          'event.venueId AS event_venueId',
          'event.description AS event_description',

          'event.recurring AS event_recurring',
          'event.status AS event_status',

          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine1 AS venue_addressLine2',

          'booking.id AS booking_id',
          'booking.status AS booking_status',
          'booking.entId AS booking_eid',

          'entertainer.id AS entertainer_id',
          'entertainer.name AS entertainer_name',
          'entertainer.bio AS entertainer_bio',

          'invoice.id AS ent_invoice_id',
          'invoice.total_with_tax AS ent_total_amount',
          'invoice.status AS ent_invoice_status',
          'invoice.invoice_number AS ent_invoice_number',
          'invoice.payment_method AS ent_payment_method',
          'invoice.payment_date AS ent_payment_date',

          'inv.id AS venue_invoice_id',
          'inv.total_with_tax AS venue_total_amount',
          'inv.status AS venue_invoice_status',
          'inv.invoice_number AS venue_invoice_number',
          'inv.payment_method AS venue_payment_method',
          'inv.payment_date AS venue_payment_date',

          'log.venue_confirmation_date',
          'log.entertainer_confirmation_date',
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
          'entertainer.id = booking.entId',
        )

        .leftJoin('invoices', 'invoice', 'invoice.user_id = booking.entId')
        .leftJoin('invoices', 'inv', 'inv.user_id = booking.venueId')
        .leftJoin(
          (qb) =>
            qb
              .select('booking_log.bookingId', 'bookingId')
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'venue' AND booking_log.status = 'confirmed' THEN booking_log.createdAt ELSE NULL END)",
                'venue_confirmation_date',
              )
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'entertainer' AND booking_log.status = 'accepted' THEN booking_log.createdAt ELSE NULL END)",
                'entertainer_confirmation_date',
              )
              .from('booking_log', 'booking_log')
              .groupBy('booking_log.bookingId'),
          'log',
          'log.bookingId = booking.id',
        );

      if (search) {
        res.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
          search: `%${search}%`,
        });
      }

      // Fetch paginated results
      const eventDetails = await res
        .orderBy('event.createdAt', 'DESC')
        .limit(limit)
        .offset(take) // ✅ Use `offset` instead of `take` for raw queries
        .getRawMany();

      // Get total count of completed events in the selected date range
      const totalCountResult = await this.eventRepo
        .createQueryBuilder('event')
        .select('COUNT(*)', 'count') // ✅ Count all rows, including duplicates
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
          'entertainer.id = booking.entId',
        )

        .leftJoin('invoices', 'invoice', 'invoice.user_id = booking.entId')
        .leftJoin('invoices', 'inv', 'inv.user_id = booking.venueUserId')
        .getRawOne();

      const totalCount = parseInt(totalCountResult.count, 10); // ✅ Get total row count

      return {
        data: eventDetails,
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
