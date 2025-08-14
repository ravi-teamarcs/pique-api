import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueEvent } from '../event/entities/event.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VenueEvent, Venue, Role, Access, EndPoints]),
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}
