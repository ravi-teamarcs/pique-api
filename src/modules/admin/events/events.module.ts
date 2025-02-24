import { Module } from '@nestjs/common';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './Entity/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Booking])],
  controllers: [EventController],
  providers: [EventService]
})
export class EventsModule { }
