import { Module } from '@nestjs/common';
import { EntertainerController } from './entertainer.controller';
import { EntertainerService } from './entertainer.service';
import { Entertainer } from './Entitiy/entertainer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categories, } from './Entitiy/Category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entertainer, Categories]),
  ],
  controllers: [EntertainerController],
  providers: [EntertainerService]
})
export class EntertainerModule { }
