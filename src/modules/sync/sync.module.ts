import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleController } from './google.controller';

@Module({
  providers: [GoogleAuthService, GoogleCalendarService],
  controllers: [GoogleController],
})
export class SyncModule {}