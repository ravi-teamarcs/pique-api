import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async getDashboardStats() {
    try {
      const totalUsers = await this.userRepo.count();

      // Count users by role
      const entertainerCount = await this.userRepo.count({
        where: { role: 'entertainer' },
      });

      console.log('entcount', entertainerCount);
      const venueCount = await this.userRepo.count({
        where: { role: 'venue' },
      });

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

      const data = {
        totalUsers,
        entertainerCount,
        venueCount,
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
}
