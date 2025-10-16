import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { Setting } from './entities/setting.entity';
import { SpecialSubcategoryPrice } from './entities/special-subcategory-prices.entity';
import { SubcategoryRate } from './entities/subcategory-rates.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EntertainerCategorySubcategory } from 'src/modules/entertainer/entities/entertainer-category-subcategory.entity';
import { Categories } from '../entertainer/entities/Category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      RoleCapability,
      Role,
      Capability,
      Setting,
      SpecialSubcategoryPrice,
      SubcategoryRate,
      Entertainer,
      Categories,
      EntertainerCategorySubcategory
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
