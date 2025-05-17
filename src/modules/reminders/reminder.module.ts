import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ReminderService } from './reminder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { VenueEvent } from '../event/entities/event.entity';
import { EmailModule } from '../Email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, VenueEvent]),
    NotificationModule,
    EmailModule,
  ],
  exports: [ReminderService],
  providers: [ReminderService],
})
export class ReminderModule {}
