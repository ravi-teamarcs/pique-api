import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../adminuser/entities/capability.entity';
import { Setting } from './entities/setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      RoleCapability,
      Role,
      Capability,
      Setting,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
