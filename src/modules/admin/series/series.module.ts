import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Series } from './entities/series.entity';
import { Venue } from '../venue/entities/venue.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../adminuser/entities/capability.entity';

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
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}
