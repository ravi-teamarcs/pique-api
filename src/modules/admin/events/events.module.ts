import { Module } from '@nestjs/common';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { MediaModule } from '../media/media.module';
import { Venue } from 'src/modules/venue/entities/venue.entity';
import { BookingModule } from '../booking/booking.module';
import { Setting } from '../settings/entities/setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Booking,
      RoleCapability,
      Role,
      Capability,
      Venue,
      Setting,
    ]),
    MediaModule,
    BookingModule,
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventsModule {}
