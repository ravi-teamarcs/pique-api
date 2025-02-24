import { Module } from '@nestjs/common';
import { GoogleCalendarServices } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGoogleToken } from './entities/google-token.entity';
import { Role } from '../auth/entities/role.entity';
import { Access } from '../auth/entities/access.entity';
import { EndPoints } from '../auth/entities/endpoint.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserGoogleToken ,Role ,Access ,EndPoints])],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarServices],
})
export class GoogleCalendarModule {}
