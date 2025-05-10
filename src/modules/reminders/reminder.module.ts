import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ReminderService } from './reminder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking ]), NotificationModule],
  exports: [ReminderService],
  providers: [ReminderService],
})
export class ReminderModule {}
