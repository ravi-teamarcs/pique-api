import { Module } from '@nestjs/common';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './Entity/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Booking,RoleCapability, Role, Capability])],
  controllers: [EventController],
  providers: [EventService]
})
export class EventsModule { }
