import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [],
})
export class MediaModule {}
