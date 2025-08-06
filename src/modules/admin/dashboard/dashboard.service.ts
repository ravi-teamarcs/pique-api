import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThan, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { EventsByMonthDto } from 'src/modules/entertainer/dto/get-events-bymonth.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entRepo: Repository<Entertainer>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,

    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Event>,
    private readonly configService: ConfigService,
  ) {}

  async getDashboardStats() {
    try {
      // Count users by role
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
      const currentYear = now.getFullYear();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );

      const entertainerCount = await this.entRepo.count({
        where: {
          status: 'pending',
          createdAt: Between(startOfMonth, startOfNextMonth),
        },
      });

      const venueCount = await this.venueRepo.count({
        where: {
          status: 'pending',
          createdAt: Between(startOfMonth, startOfNextMonth),
        },
      });

      // Booking statistics
      const eventStats = await this.eventRepo
        .createQueryBuilder('event')
        .select('CAST(COUNT(*) AS UNSIGNED)', 'confirmed')
        .where('event.status = :status', { status: 'confirmed' })
        .andWhere('YEAR(event.eventStartDateTime) = :year', {
          year: currentYear,
        })
        .andWhere('MONTH(event.eventStartDateTime) = :month', {
          month: currentMonth,
        })
        .getRawOne();

      const confirmedEventCount = parseInt(eventStats?.confirmed || '0', 10);

      // Here made changes
      const { total } = await this.invoiceRepo
        .createQueryBuilder('invoices')
        .where('invoices.user_type = :userType', { userType: 'venue' })
        .select('SUM(invoices.total_with_tax)', 'total')
        .andWhere('YEAR(invoices.created_at) = :year', {
          year: currentYear,
        })
        .andWhere('MONTH(invoices.created_at) = :month', {
          month: currentMonth,
        })
        .getRawOne();

      const data = {
        entertainerCount,
        venueCount,
        TotalRevenue: Number(total) ?? 0,
        confirmedEventCount,
      };

      return {
        message: 'Dashboard stats retuned successfully',
        data,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async upcomingEvents() {
    try {
      const currentDate = new Date().toISOString().split('T')[0];

      const upcomingEvent = await this.eventRepo
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .where('event.status = :status', { status: 'confirmed' })
        .andWhere('DATE(event.eventStartDateTime) > :currentDate', {
          currentDate,
        })
        .orderBy('DATE(event.eventStartDateTime)', 'ASC')

        .select([
          'event.id AS id',
          'event.title AS title',
          'event.userId AS userId',
          'event.venueId AS venueId',
          'event.description AS description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.endEndDateTime AS eventEndDateTime',
          'event.status AS status',
          'venue.name AS venueName',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.timezone AS timezone',
        ])
        .setParameters({
          status: 'confirmed',
          currentDate,
        })
        .getRawMany();

      return {
        message: 'Events returned Successfully',
        data: upcomingEvent,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getBookingsByMonth(): Promise<
    { name: string; y: number; color: string }[]
  > {
    const rawData = await this.bookingRepo
      .createQueryBuilder('booking')
      .select('MONTH(booking.createdAt)', 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy('month')
      .getRawMany();

    const monthMap: Record<number, string> = {
      1: 'Jan',
      2: 'Feb',
      3: 'Mar',
      4: 'Apr',
      5: 'May',
      6: 'Jun',
      7: 'Jul',
      8: 'Aug',
      9: 'Sep',
      10: 'Oct',
      11: 'Nov',
      12: 'Dec',
    };

    // Initialize an array with zero bookings for each month
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: monthMap[i + 1],
      y: 0, // Set initial count to 0 for all months
      color: '#00e0d7',
    }));

    // Update the data array with the actual booking counts
    rawData.forEach(({ month, count }) => {
      const monthIndex = Number(month) - 1; // Adjust index to match 0-based array
      data[monthIndex].y = Number(count); // Update the count for the respective month
    });

    return data;
  }

  async getMonthlyRevenueStats(): Promise<{
    series: { name: string; data: number[] }[];
  }> {
    const rawData = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('MONTH(invoice.created_at)', 'month') // use your timestamp column name
      .addSelect('SUM(invoice.total_with_tax)', 'revenue')
      .where('YEAR(invoice.created_at) = :year', {
        year: new Date().getFullYear(),
      })
      .where('invoice.user_type = :userType', { userType: 'venue' })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthlyRevenueData = months.map((name, index) => {
      const found = rawData.find((r) => parseInt(r.month) === index + 1);
      return found ? parseFloat(found.revenue) : 0;
    });

    // Wrap the data in a 'series' format
    return {
      series: [
        {
          name: 'Revenue',
          data: monthlyRevenueData,
        },
      ],
    };
  }

  // This needs change (Don't use booking Fixed used event Instead.)
  async getEventDetailsByMonth(query: EventsByMonthDto) {
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

    const skip = Number((page - 1) * pageSize);

    try {
      const qb = this.eventRepo
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .andWhere('YEAR(event.eventStartDateTime) = :year', { year })
        .andWhere('MONTH(event.eventStartDateTime) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.status AS status',
          'venue.id AS venueId',
          'venue.name AS venueName',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
          'venue.timezone AS timezone',
          'venue.city AS cityCode',
          'venue.state AS stateCode',
          'city.name AS cityName',
          'state.name AS stateName',
          'code.stateCode AS stateNameCode',
        ])
        .orderBy('DATE(event.eventStartDateTime)', 'ASC');
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
