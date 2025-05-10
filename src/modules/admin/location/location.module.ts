import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cities } from './entities/city.entity';
import { Countries } from './entities/country.entity';
import { States } from './entities/state.entity';

import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Countries, Cities, States,RoleCapability, Role, Capability])],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule { }
