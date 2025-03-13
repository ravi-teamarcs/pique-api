import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './Entity/venue.entity';
import { User } from '../users/Entity/users.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Venue,User,Role,RoleCapability,Capability]),
  ],
  controllers: [VenueController],
  providers: [VenueService]
})
export class VenueModule { } 
