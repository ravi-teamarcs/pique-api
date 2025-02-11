import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { GoogleCalendarServices } from './google-calendar.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-google-event.dto';

@ApiTags('google-calendar')
@Controller('auth')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarServices) {}

  @Get('google')
  @ApiOperation({ summary: 'Use To get Google O-Auth Url' })
  @ApiResponse({
    status: 200,
    description: 'entertainer created.',
  })
  getAuthUrl() {
    return this.googleCalendarService.getAuthUrl();
  }

  @Get('google/callback')
  async handleGoogleCallback(@Query('code') code: string, @Res() res) {
    const tokens = await this.googleCalendarService.getAccessToken(code);

    // Store tokens in DB (linked to user)
    return res.redirect(
      `https://yourfrontend.com?token=${tokens.access_token}`,
    );
  }

  @Post('add-event')
  async addBookingToCalendar(@Req() req, @Body() eventDetails: CreateEventDto) {
    const userAccessToken = req.user.accessToken; // Fetch from DB
    // return this.googleCalendarService.createCalendarEvent(
    //   userAccessToken,
    //   eventDetails,
    // );
  }
}
