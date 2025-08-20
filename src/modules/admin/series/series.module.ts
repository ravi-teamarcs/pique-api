import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeriesController, } from './series.controller';
import { AdminSeriesService } from './series.service';
import { Module } from '@nestjs/common';
import { Capability } from '../adminuser/entities/capability.entity';
import { Series } from './entities/series.entity';
import { Role } from '../auth/entities/role.entity';
import { Venue } from '../venue/entities/venue.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Event } from '../events/entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Venue,
      RoleCapability,
      Role,
      Capability,
      Series,
    ]),
  ],
  controllers: [AdminSeriesController],
  providers: [AdminSeriesService],
})
export class AdminSeriesModule {}
