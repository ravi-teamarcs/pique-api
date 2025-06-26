import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role } from '../auth/entities/role.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Categories } from '../entertainer/entities/Category.entity';
import { EntertainerCategorySubcategory } from 'src/modules/entertainer/entities/entertainer-category-subcategory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      RoleCapability,
      Capability,
      Venue,
      Entertainer,
      Categories,
      EntertainerCategorySubcategory,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
