import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Entity/users.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role } from '../auth/entities/role.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { RolesGuardAdmin } from '../auth/roles.guard';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, RoleCapability, Capability]),
  ],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule { }
