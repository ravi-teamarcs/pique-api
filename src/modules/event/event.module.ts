import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { VenueEvent } from './entities/event.entity';

import { User } from '../users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VenueEvent, User])],
  controllers: [EventController],
  providers: [EventService],
  exports: [],
})
export class EventModule {}
