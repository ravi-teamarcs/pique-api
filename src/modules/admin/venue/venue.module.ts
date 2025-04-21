import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { User } from '../users/entities/users.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venue,
      User,
      Role,
      RoleCapability,
      Capability,
      Neighbourhood,
    ]),
    MediaModule,
  ],
  controllers: [VenueController],
  providers: [VenueService],
})
export class VenueModule {}
