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
import { ConfigService } from '@nestjs/config';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingCalendarSync } from '../booking/entities/booking-sync.entity';

@Injectable()
export class GoogleCalendarServices {
  private oauth2Client;
  private selectedRedirectUri: string;

  constructor(
    @InjectRepository(UserGoogleToken)
    private readonly tokenRepository: Repository<UserGoogleToken>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly enteratinerRepository: Repository<Entertainer>,
    @InjectRepository(BookingCalendarSync)
    private readonly syncCalendarRepo: Repository<BookingCalendarSync>,
    private readonly configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<'string'>('GOOGLE_CLIENT_ID'),
      this.configService.get<'string'>('GOOGLE_CLIENT_SECRET'),
      this.getRedirectUri(),
    );
  }

  private getRedirectUri(): string {
    const rawUris = this.configService.get<string>('GOOGLE_REDIRECT_URIS');
    const redirectUris = JSON.parse(rawUris);
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    return isProd
      ? redirectUris.find((uri) => uri.includes('digidemo.in'))
      : redirectUris.find((uri) => uri.includes('localhost'));
  }

  // Get Google OAuth URL  required for getting tokens so you dont have to authenticate everytime
  getAuthUrl(user) {
    const { role, userId } = user;
    try {
      const scopes = ['https://www.googleapis.com/auth/calendar'];
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: JSON.stringify({ id: userId, role }),
      });
      return {
        message: 'Auth Url return Successfully',
        data: authUrl,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
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
        message: error.message,
        status: false,
      });
    }
  }

  // Add a booking to Google Calendar
  async createCalendarEvent(accessToken: string, eventDetails: CreateEventDto) {
    const { eventDate, startTime, endTime, title, description } = eventDetails;
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });

    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: new Date(`${eventDate}T${startTime}`).toISOString(),
      },
      end: {
        dateTime: new Date(`${eventDate}T${endTime}`).toISOString(),
      },
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

  // To get confirmed Booking
  async getConfirmedBooking(userId: number, role: string) {
    let conditionField = '';
    let conditionId = null;

    if (role === 'entertainer') {
      const entertainer = await this.enteratinerRepository.findOne({
        where: { user: { id: userId } },
      });
      conditionField = 'booking.entId';
      conditionId = entertainer.id;
    } else {
      const venue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });
      conditionField = 'booking.venueId';
      conditionId = venue.id;
    }

    const now = new Date();
    const nowString = now.toISOString().split('T')[0];
    console.log(typeof nowString);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .select([
        'booking.id AS bookingId',
        'event.title AS title',
        'event.eventDate AS eventDate',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
      ])
      .where(conditionField + ' = :id', { id: conditionId }) // dynamic condition
      .andWhere('booking.status = :status', { status: 'confirmed' })
      .andWhere('event.eventDate > :nowString', {
        nowString,
      }) // filter future events
      .getRawMany();

    return bookings;
  }

  // To keep track which booking has alraedy synce (to prevent duplication)
  async checkAlreadySynced(bookings, userId: number) {
    const alreadySynced = await this.syncCalendarRepo.find({
      where: { userId },
    });
    // Get Synced booking Id in Array
    const syncedBookingIds = alreadySynced.map((s) => s.bookingId);

    const unsyncedBookings = bookings.filter(
      (b) => !syncedBookingIds.includes(b.id),
    );
    return unsyncedBookings;
  }

  // To keep track which booking is synced for which user ()
  async saveSyncedBooking(bookingId: number, userId: number, eventId: string) {
    const booking = this.syncCalendarRepo.create({
      bookingId,
      userId,
      isSynced: true,
      syncedAt: new Date(),
      calendarEventId: eventId,
    });

    await this.syncCalendarRepo.save(booking);
    return { message: 'Booking Saved Successfully', status: true };
  }

  async checkUserhasSyncCalendar(userId) {
    const user = await this.tokenRepository.findOne({
      where: { user: userId },
    });
    if (user) {
      const { data } = await this.getValidAccessToken(userId);
      return data;
    }
  }

  async adminConfirmedEvents() {
    const now = new Date();
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .select([
        'booking.id AS bookingId',
        'event.title AS title',
        'event.description AS description',
        'event.eventDate AS eventDate',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
      ])
      .where('booking.status = :status', { status: 'confirmed' })
      .andWhere('event.eventDate > :now', { now })
      .getRawMany();

    return bookings;
  }

  async checkAlreadySyncedAdminBooking(bookings, userId: number) {
    const alreadySynced = await this.syncCalendarRepo.find({
      where: { userId, isAdmin: true },
    });
    // Get Synced booking Id in Array
    const syncedBookingIds = alreadySynced.map((s) => s.bookingId);

    const unsyncedBookings = bookings.filter(
      (b) => !syncedBookingIds.includes(b.id),
    );
    return unsyncedBookings;
  }

  async syncAdminCalendar(userId: number, accessToken: string) {
    const bookings = await this.adminConfirmedEvents();
    // check if bookings are not already synced or not
    const unsyncedBookings = await this.checkAlreadySyncedAdminBooking(
      bookings,
      userId,
    );

    if (unsyncedBookings.length === 0) {
      return {
        status: true,
        message: 'All bookings are already synced with Google Calendar.',
      };
    }

    if (unsyncedBookings && unsyncedBookings.length > 0) {
      for (const booking of unsyncedBookings) {
        const payload = {
          title: booking.title,
          description: booking.description,
          eventDate: booking.eventDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
        };

        const { id } = await this.createCalendarEvent(accessToken, payload);

        const save = this.syncCalendarRepo.create({
          bookingId: booking.id,
          userId,
          isSynced: true,
          syncedAt: new Date(),
          calendarEventId: id,
        });

        await this.syncCalendarRepo.save(save);
      }
    }
    return { message: 'Admin Calendar Synced Successfully ' };
  }
}
