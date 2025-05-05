import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';

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
      const entertainerCount = await this.entRepo.count();
      const venueCount = await this.venueRepo.count();

      // Booking statistics
      const bookingStats = await this.bookingRepo
        .createQueryBuilder('booking')
        .select([
          'COUNT(*) as total',
          "CAST(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS UNSIGNED) as confirmed",
          "CAST(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS UNSIGNED) as rejected",
          "CAST(SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) AS UNSIGNED) as canceled",
        ])
        .getRawOne();

      const { total } = await this.invoiceRepo
        .createQueryBuilder('invoices')
        .where('invoices.user_type = :userType', { userType: 'venue' })
        .select('SUM(invoices.total_amount)', 'total')
        .getRawOne();

      const data = {
        entertainerCount,
        venueCount,
        TotalRevenue: Number(total) ?? 0,
        bookingStats: {
          total: Number(bookingStats.total),
          confirmed: Number(bookingStats.confirmed),
          rejected: Number(bookingStats.rejected),
          canceled: Number(bookingStats.canceled),
        },
      };

      return {
        message: 'Dashboard Stats retuned successfully',
        data,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ Message: error.message });
    }
  }

  async upcomingEvents() {
    try {
      const currentDate = new Date();
      const baseUrl = this.configService.get<string>('BASE_URL'); // Base URL for images
      const fallbackUrl =
        'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';

      const upcomingEvent = await this.eventRepo
        .createQueryBuilder('event')
        .leftJoin(
          'media',
          'media',
          'media.eventId = event.id AND media.type = :mediaType',
        )
        .where('event.status = :status', { status: 'confirmed' })
        .andWhere('event.startTime > :currentDate', { currentDate })
        .orderBy('event.startTime', 'ASC')
        .select([
          'event.id AS id',
          'event.title AS title',
          'event.location AS location',
          'event.userId AS userId',
          'event.venueId AS venueId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',

          `COALESCE(
            CASE 
              WHEN media.url IS NOT NULL THEN CONCAT(:baseUrl, media.url) 
              ELSE :fallbackUrl 
            END, :fallbackUrl
          ) AS image_url`,
        ])
        .setParameters({
          mediaType: 'event_headshot',
          baseUrl,
          fallbackUrl,
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
      .addSelect('SUM(invoice.total_amount)', 'revenue')
      .where('YEAR(invoice.created_at) = :year', {
        year: new Date().getFullYear(),
      })
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
}
