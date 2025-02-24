import { Module } from '@nestjs/common';
import { AdminuserController } from './adminuser.controller';
import { AdminuserService } from './adminuser.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from './entities/role.entity';
import { Capability } from './entities/capability.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleCapability, Role, Capability]),
  ],
  controllers: [AdminuserController],
  providers: [AdminuserService]
})
export class AdminuserModule { }
