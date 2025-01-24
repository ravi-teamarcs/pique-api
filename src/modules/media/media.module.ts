import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Media } from './entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User ,Media])],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [],
})
export class MediaModule {}
