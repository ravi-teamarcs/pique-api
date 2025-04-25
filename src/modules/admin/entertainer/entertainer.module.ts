import { Module } from '@nestjs/common';
import { EntertainerController } from './entertainer.controller';
import { EntertainerService } from './entertainer.service';
import { Entertainer } from './entities/entertainer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categories } from './entities/Category.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
import { User } from '../users/entities/users.entity';
import { AdminCreatedUser } from '../users/entities/admin.created.entity';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Entertainer,
      Categories,
      RoleCapability,
      Role,
      Capability,
      User,
      AdminCreatedUser,
    ]),
    MediaModule,
  ],
  controllers: [EntertainerController],
  providers: [EntertainerService],
})
export class EntertainerModule {}
