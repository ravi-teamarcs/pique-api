import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './Entity/venue.entity';
import { User } from '../users/Entity/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue,User]),
  ],
  controllers: [VenueController],
  providers: [VenueService]
})
export class VenueModule { } 
