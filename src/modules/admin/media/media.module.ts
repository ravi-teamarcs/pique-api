import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './Entity/media.entity';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Role } from '../auth/entities/role.entity';
import { Capability } from '../auth/entities/capability.entity';
@Module({
  imports: [
      TypeOrmModule.forFeature([Media,RoleCapability,Role,Capability]),
    ],
  controllers: [MediaController],
  providers: [MediaService]
})
export class MediaModule {}
