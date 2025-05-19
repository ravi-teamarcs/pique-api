import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cities } from './entities/city.entity';
import { Countries } from './entities/country.entity';
import { States } from './entities/state.entity';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Countries, Cities, States])],
  controllers: [LocationController],
  providers: [LocationService, GeocodingService],
})
export class LocationModule {}
