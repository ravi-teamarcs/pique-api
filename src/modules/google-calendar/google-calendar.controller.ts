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
import { title } from 'process';

@ApiTags('google-calendar')
@Controller('auth')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarServices) {}

  @Get('google')
  @UseGuards(JwtAuthGuard)
  @Roles('findAll')
  @ApiOperation({ summary: 'Use To get Google O-Auth Url' })
  @ApiResponse({
    status: 200,
    description: 'entertainer created.',
  })
  getAuthUrl(@Req() req) {
    const user = req.user;
    return this.googleCalendarService.getAuthUrl(user);
  }

  @ApiOperation({ summary: ' Used By  Google Calendar' })
  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response_object,
    @Req() req,
  ) {
    const userState = JSON.parse(state); // Extract user ID
    const { id: userId, role } = userState;
    console.log(req);
    if (role === 'admin') {
      const res = await this.googleCalendarService.getAdminAccessToken(code);
      await this.googleCalendarService.saveToken(
        {
          userId,
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
          expiresAt: new Date(Date.now() + res.data.expiry_date),
        }, // Set expiration date for the token
      );

      await this.googleCalendarService.syncAdminCalendar(
        userId,
        res.data.access_token,
        response_object,
      );
    } else {
      // console.log(`Callback By google: ${userId} and typeof ${typeof userId}`);
      const response = await this.googleCalendarService.getAccessToken(code);
      // Store Token in DB (linked to user)
      await this.googleCalendarService.saveToken(
        {
          userId,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt: new Date(Date.now() + response.data.expiry_date),
        }, // Set expiration date for the token
      );
      //   Use Booking Service Here
      const bookings = await this.googleCalendarService.getConfirmedBooking(
        Number(userId),
        role,
      );

      const unsyncedBookings =
        await this.googleCalendarService.checkAlreadySynced(
          bookings,
          Number(userId),
        );
      if (unsyncedBookings.length === 0) {
        response_object.redirect('https://digidemo.in/p/successSync');
      }

      if (unsyncedBookings && unsyncedBookings.length > 0) {
        for (const booking of unsyncedBookings) {
          const payload = {
            title: booking.title,
            description: booking.description,
            eventDate: booking.eventDate.toISOString().split('T')[0],
            startTime: booking.startTime,
            endTime: booking.endTime,
          };

          const { id } = await this.googleCalendarService.createCalendarEvent(
            response.data.access_token,
            payload,
          );
          await this.googleCalendarService.saveSyncedBooking(
            booking.bookingId,
            userId,
            id,
          );
        }
      }
    }
    return response_object.redirect('https://digidemo.in/p/successSync');
  }
}

// @ApiOperation({ summary: 'Allow User to Add Events to Google Calendar' })

// @ApiResponse({
//   status: 201,
//   description: 'Event Created Succssfully.',
// })
// @Post('google/calendar/add-event')
// @UseGuards(JwtAuthGuard)
// async addBookingToCalendar(@Req() req, @Body() eventDetails: CreateEventDto) {
//   try {
//     const { userId } = req.user;
//     const { data } =
//       await this.googleCalendarService.getValidAccessToken(userId);
//     return await this.googleCalendarService.createCalendarEvent(
//       data,
//       eventDetails,
//     );
//   } catch (error) {
//     throw new InternalServerErrorException({
//       message: 'Something went wrong ',
//       status: false,
//     });
//   }
// }
