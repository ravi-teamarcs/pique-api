import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GoogleCalendarServices } from './google-calendar.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-google-event.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('google-calendar')
@Controller('auth')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarServices) {}

  @Get('google')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Use To get Google O-Auth Url' })
  @ApiResponse({
    status: 200,
    description: 'entertainer created.',
  })
  getAuthUrl(@Req() req) {
    const { userId } = req.user;
    return this.googleCalendarService.getAuthUrl(userId);
  }

  @ApiOperation({ summary: ' Used By  Google Calendar' })
  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res,
  ) {
    const userState = JSON.parse(state); // Extract user ID
    const userId = userState.id;

    console.log(`Callback By google: ${userId} and typeof ${typeof userId}`);
    const response = await this.googleCalendarService.getAccessToken(code);
    // Store Token in DB (linked to user)

    // Save Token to DB
    await this.googleCalendarService.saveToken(
      {
        userId,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expiry_date),
      }, // Set expiration date for the token
    );

    return response;
  }

  @ApiOperation({ summary: 'Allow User to Add Events to Google Calendar' })
  @ApiResponse({
    status: 201,
    description: 'Event Created Succssfully.',
  })
  @Post('google/calendar/add-event')
  @UseGuards(JwtAuthGuard)
  async addBookingToCalendar(@Req() req, @Body() eventDetails: CreateEventDto) {
    try {
      const { userId } = req.user;
      const { data } =
        await this.googleCalendarService.getValidAccessToken(userId);
      return await this.googleCalendarService.createCalendarEvent(
        data,
        eventDetails,
      );
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Something went wrong ',
        status: false,
      });
    }
  }
}
