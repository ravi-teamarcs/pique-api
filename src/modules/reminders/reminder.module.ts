import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ReminderService } from './reminder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { EmailModule } from '../Email/email.module';
import { ReminderController } from './reminder.controller';
import { BookingReminder } from './entities/booking-reminder.entity';
import { AdminUser } from '../admin/auth/entities/AdminUser.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, VenueEvent, BookingReminder, AdminUser]),
    NotificationModule,
    EmailModule,
  ],
  controllers: [ReminderController],
  exports: [ReminderService],
  providers: [ReminderService],
})
export class ReminderModule {}
