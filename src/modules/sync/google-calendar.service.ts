import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  async createEvent(tokens, eventDetails) {
    const oauth2Client = this.googleAuthService.getOAuthClient();
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventDetails.summary,
      location: eventDetails.location,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime, // ISO format
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: 'UTC',
      },
    };

    // ✅ Correct way to insert event
    const response = await calendar.events.insert({
      calendarId: 'primary', // ✅ Ensure calendarId is inside the object
      requestBody: event, // ✅ Use `requestBody` instead of `resource`
    });

    return response.data; // ✅ Properly access `data`
  }
}
