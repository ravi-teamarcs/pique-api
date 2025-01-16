import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntertainerService } from './entertainer.service';
import { EntertainerController } from './entertainer.controller';
import { Entertainer } from './entities/entertainer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Entertainer])],
  controllers: [EntertainerController],
  providers: [EntertainerService],
})
export class EntertainerModule {}
