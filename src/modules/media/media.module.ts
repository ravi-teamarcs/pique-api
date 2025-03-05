import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Media } from './entities/media.entity';
import { MulterModule } from '@nestjs/platform-express';
import { multerConfig } from './multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Media]),
    MulterModule.register(multerConfig),
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [],
})
export class MediaModule {}
