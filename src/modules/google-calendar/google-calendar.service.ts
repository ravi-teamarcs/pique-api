import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { CreateEventDto } from './dto/create-google-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGoogleToken } from './entities/google-token.entity';
import { GoogleTokenDto } from './dto/save-token.dto';

@Injectable()
export class GoogleCalendarServices {
  private oauth2Client;

  constructor(
    @InjectRepository(UserGoogleToken)
    private readonly tokenRepository: Repository<UserGoogleToken>,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  // Get Google OAuth URL  required for getting tokens so you dont have to authenticate everytime
  getAuthUrl(userId: number) {
    try {
      const scopes = ['https://www.googleapis.com/auth/calendar'];
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        state: JSON.stringify({ id: userId }),
      });
      return {
        message: 'Auth Url return Successfully',
        data: authUrl,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to create auth Url',
        status: false,
      });
    }
  }

  // Exchange code for access token
  async getAccessToken(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      return {
        message: 'Token returned Successfully',
        data: tokens,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to get access token',
        status: false,
      });
    }
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
      },
      end: { dateTime: eventDetails.endTime },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  async saveToken(tokenDto: GoogleTokenDto) {
    try {
      const { userId, accessToken, refreshToken, expiresAt } = tokenDto;

      const user = await this.tokenRepository.findOne({
        where: { user: userId },
      });

      if (user) {
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        user.expiresAt = expiresAt;
        this.tokenRepository.save(user);
        return {
          message: 'Token saved Successfully',
          status: true,
        };
      } else {
        const newToken = this.tokenRepository.create({
          user: userId, // Set user reference
          accessToken,
          refreshToken,
          expiresAt,
        });
        this.tokenRepository.save(newToken);
        return {
          message: 'Token saved Successfully',
          status: true,
        };
      }
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to save token',
        status: false,
      });
    }
  }

  async getValidAccessToken(userId: number) {
    const userToken = await this.tokenRepository.findOne({
      where: { user: userId },
    });

    if (!userToken) {
      throw new NotFoundException({
        message: 'User has not linked Google Calendar.',
        status: false,
      });
    }

    const isExpired = new Date() > userToken.expiresAt;

    if (isExpired) {
      const { credentials } = await this.oauth2Client.refreshToken(
        userToken.refreshToken,
      );
      userToken.accessToken = credentials.access_token;
      userToken.expiresAt = new Date(Date.now() + credentials.expiry_date);
      await this.tokenRepository.save(userToken);
    }

    return {
      message: 'Access token fetched Successfully',
      data: userToken.accessToken,
      status: true,
    };
  }
}
