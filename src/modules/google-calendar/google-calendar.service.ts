import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { CreateEventDto } from './dto/create-google-event.dto';

@Injectable()
export class GoogleCalendarServices {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  // Get Google OAuth URL  required for getting tokens so you dont have to authenticate everytime
  getAuthUrl() {
    try {
      const scopes = ['https://www.googleapis.com/auth/calendar.events'];
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
      });
      return {
        message: 'Auth Url return Successfully',
        data: authUrl,
        status: true,
      };
    } catch (error) {}
  }

  // Exchange code for access token
  async getAccessToken(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // Add a booking to Google Calendar
  async createCalendarEvent(accessToken: string, eventDetails: CreateEventDto) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });

    const event = {
      summary: eventDetails.title,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime,
        timeZone: eventDetails.timeZone,
      },
      end: { dateTime: eventDetails.endTime, timeZone: eventDetails.timeZone },
    };

    // const response =  await calendar.events.insert({
    //   calendarId: 'primary',
    //   resource: event,
    // });

    // return response.data;
  }
}
