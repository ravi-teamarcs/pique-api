import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Get('login')
  login(@Res() res: Response) {
    const url = this.googleAuthService.getAuthUrl();
    res.redirect(url);
    // console.log("URL :",url);
    // res.json("sdf");
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    const tokens = await this.googleAuthService.getTokens(code);
    
    // Store tokens in DB or session (for real-world apps)
    res.json(tokens);
  }

  @Get('create-event')
  async createEvent(@Query('accessToken') accessToken: string) {
    const tokens = { access_token: accessToken };
    console.log(accessToken);
    const eventDetails = {
      summary: 'Test Event',
      location: 'Online',
      description: 'This is a test event synced with Google Calendar.',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(), 
    };

    const event = await this.googleCalendarService.createEvent(tokens, eventDetails);
    return { message: 'Event Created Successfully', event };
  }
}
