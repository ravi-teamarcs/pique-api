import { Module } from '@nestjs/common';
import { GoogleCalendarServices } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
  imports: [],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarServices],
})
export class GoogleCalendarModule {}
