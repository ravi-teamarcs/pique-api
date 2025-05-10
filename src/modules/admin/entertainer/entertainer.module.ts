import { Module } from '@nestjs/common';
import { EntertainerController } from './entertainer.controller';
import { EntertainerService } from './entertainer.service';
import { Entertainer } from './entities/entertainer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categories, } from './entities/Category.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Entertainer, Categories,RoleCapability, Role, Capability]),
  ],
  controllers: [EntertainerController],
  providers: [EntertainerService]
})
export class EntertainerModule { }
