import {
  format as tzFormat,
  formatInTimeZone,
  utcToZonedTime,
  zonedTimeToUtc,
} from 'date-fns-tz';
import { format } from 'date-fns';
import { nowUtc } from 'src/common/utils/common.utils';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeriesDto } from 'src/modules/series/dto/series.dto';
import { Series } from './entities/series.entity';
import { Venue } from '../venue/entities/venue.entity';
import { AddSeriesDto } from './dto/add-series.dto';
import { Event } from '../events/entities/event.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class AdminSeriesService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly bookingService: BookingService,
  ) {}

  async getUpcomingEventForSeries() {
    try {
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .select([
          'event.id AS id',
          'event.description AS description',
          'event.title AS title',
          'event.slug AS slug',
          'event.status AS eventStatus',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.title AS eventTitle',
          'event.series_id AS seriesId',

          'venue.id AS venueId',
          'venue.name AS venueName',
          'venue.addressLine1 AS venueAddressLine1',
          'venue.addressLine1 AS venueAddressLine2',
          'venue.timezone AS venueTimeZone',
          'hood.id AS neighbourHoodId',
          'hood.name AS neighbourHoodName',
        ])
        .andWhere('event.eventStartDateTime >= :time ', { time: nowUtc() })
        .andWhere('event.status IN (:...statuses)', {
          statuses: ['unpublished', 'invited', 'rescheduled', 'confirmed'],
        })

        .andWhere('event.series_id IS NULL')
        .orderBy('DATE(event.eventStartDateTime)', 'ASC')
        .getRawMany();

      const parsedResult = event.map(
        ({ eventStartDateTime, eventEndDateTime, ...rest }) => {
          const eventStart = utcToZonedTime(
            eventStartDateTime,
            rest.venueTimeZone,
          );
          const eventEnd = utcToZonedTime(eventEndDateTime, rest.venueTimeZone);

          return {
            ...rest,
            eventStartDateTimeLocal: tzFormat(
              eventStart,
              'yyyy-MM-dd hh:mm a z',
              {
                timeZone: rest.venueTimeZone ?? 'UTC',
              },
            ),
            eventStartDateTime,
            eventEndDateTimeLocal: tzFormat(eventEnd, 'yyyy-MM-dd hh:mm a z', {
              timeZone: rest.venueTimeZone ?? 'UTC',
            }),

            eventEndDateTime,
          };
        },
      );

      return {
        message: 'Upcoming events fetched successfully',
        data: parsedResult,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
  async createSeries(payload: AddSeriesDto) {
    const { seriesName, events, existingEvents } = payload;
    try {
      const seriesPayload = { seriesName };
      const series = this.seriesRepository.create(seriesPayload);
      const savedSeries = await this.seriesRepository.save(series);

      if (events && events.length > 0) {
        const newRecords = events.map((event: any) => {
          return {
            ...event,
            seriesId: savedSeries.id,
          };
        });
        for (const event of newRecords) {
          await this.addNewEventToSeries(event);
        }
      }

      if (existingEvents && existingEvents.length > 0) {
        for (const eventId of existingEvents) {
          await this.addExistingEventToSeries(eventId, savedSeries.id);
        }
      }
      return {
        message: 'Series created successfully',
        status: true,
        data: savedSeries,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllSeries(query) {
    try {
      const { page, pageSize, search } = query;
      const [series, totalCount] = await this.seriesRepository.findAndCount({
        relations: ['events'],
      });
      return {
        message: 'series returned Successfully',
        data: series,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async addExistingEventToSeries(eventId: number, seriesId: number) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });
      if (!event) throw new NotFoundException('Event not found');
      this.eventRepository.update(
        { id: event.id },
        { series: { id: seriesId } },
      );

      return { message: 'Event added successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getSeriesById(id: number) {
    try {
      const series = await this.seriesRepository.findOne({
        where: { id },
        relations: ['events'],
      });
      if (!series) throw new NotFoundException('Series Not Found');

      const parsedResult = await Promise.all(
        series?.events?.map(async (event: any) => {
          const venue = await this.venueRepository.findOne({
            where: { id: event.venueId },
            select: ['timezone'],
          });
          return {
            ...event,
            venueTimeZone: venue.timezone,
          };
        }),
      );
      const returnPayload = {
        id: series.id,
        seriesName: series.seriesName,
        events: parsedResult,
      };
      return {
        message: 'series returned Successfully',
        data: returnPayload,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeEventFromSeries(id: number, seriesId: number) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id, series: { id: seriesId } },
      });
      if (!event) new NotFoundException('Event Not Found');

      await this.eventRepository.update(
        { id: event.id },
        { series: { id: null } },
      );
      return { message: 'Event removed from series', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeSeriesAndEvents(seriesId: number) {
    try {
      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
      });
      if (!series) throw new NotFoundException('Series not Found');
      await this.seriesRepository.remove(series);

      return { message: 'Series and Event deleted Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async addNewEventToSeries(dto) {
    try {
      const {
        title,
        seriesId,
        venueId,
        description,
        eventStartDateTime,
        eventEndDateTime,
        neighbourhoodId,
      } = dto;

      const venue = await this.venueRepository.findOne({
        where: { id: venueId },
        select: ['timezone'],
      });

      if (!venue.timezone) {
        console.warn(
          `No timezone set for venue ID ${venue.id}. Defaulting to UTC.`,
        );
      }

      const startTime = zonedTimeToUtc(
        eventStartDateTime,
        venue.timezone ?? 'UTC',
      );
      const endTime = zonedTimeToUtc(eventEndDateTime, venue.timezone ?? 'UTC');

      const savePayload = {
        eventStartDateTime: startTime.toISOString(),
        eventEndDateTime: endTime.toISOString(),
        venueId,
        title,
        description: description,
        series: { id: seriesId },
      };

      const payload = {
        title,
        venueId,
        eventStartDateTime: startTime,
        eventEndDateTime: endTime,
        neighbourhoodId,
      };

      const slug = await this.generateSlug(payload);
      const event = this.eventRepository.create({
        sub_venue_id: neighbourhoodId,
        slug,
        ...savePayload,
      });

      const savedEvent = await this.eventRepository.save(event);
      return { message: 'Event created Successfully', event, status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  private async generateSlug(payload) {
    const {
      neighbourhoodId,
      title,
      venueId,
      eventStartDateTime,
      eventEndDateTime,
    } = payload;

    const { name, neighbourhoodName, city, stateCode, venueTimeZone } =
      await this.venueRepository
        .createQueryBuilder('venue')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('neighbourhood', 'hood', 'hood.id = :neighbourhoodId', {
          neighbourhoodId,
        })
        .select([
          'venue.id AS id',
          'venue.name AS name',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.timezone AS venueTimeZone',
          'city.name AS city',
          'code.StateCode AS stateCode',
          'hood.name AS neighbourhoodName',
          'hood.contactPerson AS neighbourhood_contact_person',
          'hood.contactNumber AS neighbourhood_contact_number',
        ])
        .where('venue.id = :id', { id: venueId })
        .getRawOne();

    const venueLocalTime = utcToZonedTime(eventStartDateTime, venueTimeZone);

    const formattedDate = format(venueLocalTime, 'M/d');
    const format12HourTime = format(venueLocalTime, 'hh:mm a');

    const titleString = title ? `(${title})` : '';
    const neighbourhoodNameString = neighbourhoodName
      ? `${neighbourhoodName}/`
      : '';
    const stateString = stateCode ? `, ${stateCode}` : '';

    const slug = `${formattedDate} at ${format12HourTime} ${titleString} at ${neighbourhoodNameString}${name} in ${city ?? ''}${stateString}`;

    return slug;
  }

  async updateSeries(payload) {
    try {
      const { seriesName, events, seriesId, existingEvents, updatedEvents } =
        payload;

      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
      });

      if (!series) throw new NotFoundException('series not found');

      await this.seriesRepository.update({ id: series.id }, { seriesName });

      if (events && events.length > 0) {
        const newRecords = events.map((event: any) => {
          return {
            ...event,
            seriesId: series.id,
          };
        });
        for (const event of newRecords) {
          await this.addNewEventToSeries(event);
        }
      }

      if (existingEvents && existingEvents.length > 0) {
        for (const eventId of existingEvents) {
          await this.addExistingEventToSeries(eventId, series.id);
        }
      }

      for (const event of updatedEvents) {
        // Need to use external Service
        await this.handleUpdateEvent(event);
      }

      return { message: 'Series updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async handleUpdateEvent(dto: any) {
    const {
      title,
      description,
      eventId,
      venueId,
      neighbourhoodId,
      eventStartDateTime,
      eventEndDateTime,
    } = dto;

    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
    });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    try {
      const venue = await this.venueRepository.findOne({
        where: { id: venueId },
        select: ['timezone'],
      });

      if (!venue.timezone) {
        console.warn(
          `No timezone set for venue ID ${venue.id}. Defaulting to UTC.`,
        );
      }

      const startTime = zonedTimeToUtc(
        eventStartDateTime,
        venue.timezone ?? 'UTC',
      );
      const endTime = zonedTimeToUtc(eventEndDateTime, venue.timezone ?? 'UTC');

      const slugPayload = {
        title,
        neighbourhoodId,
        venueId,
        eventStartDateTime: startTime,
        eventEndDateTime: endTime,
      };
      const slug = await this.generateSlug(slugPayload);

      const updatePayload = {
        title,
        description,
        eventStartDateTime: startTime.toISOString(),
        eventEndDateTime: endTime.toISOString(),
        venueId,
        slug,
        sub_venue_id: neighbourhoodId,
      };

      const hasStartDateTimeChanged =
        startTime &&
        formatInTimeZone(endTime, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") !==
          formatInTimeZone(
            new Date(event.eventStartDateTime),
            'UTC',
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
          );

      const hasEndDateTimeChanged =
        endTime &&
        formatInTimeZone(endTime, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") !==
          formatInTimeZone(
            new Date(event.eventStartDateTime),
            'UTC',
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
          );

      if (hasStartDateTimeChanged || hasEndDateTimeChanged) {
        updatePayload['status'] = 'rescheduled';
      }
      await this.eventRepository.update({ id: event.id }, updatePayload);

      if (hasStartDateTimeChanged || hasEndDateTimeChanged) {
        this.bookingService.handleChangeRequest(Number(event.id), {
          eventStartDateTime: startTime.toISOString(),
          eventEndDateTime: endTime.toISOString(),
        });
      }
      return { message: 'Event updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error updating event',
        error: error.message,
        status: error.status,
      });
    }
  }

  async getBookedEntertainerForSeries(seriesId: number) {
    try {
      const events = await this.eventRepository.find({
        where: { series: { id: seriesId } },
        select: ['id', 'slug', 'title'],
        relations: ['series'], // only if you need series loaded
      });

      const eventIds = events?.map((event) => Number(event.id));
      if (eventIds.length === 0)
        return { message: 'No events for series', data: [], status: true };

      const rawBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('event', 'event', 'event.id =booking.eventId')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('categories', 'category', 'category.id = booking.categoryId')
        .leftJoin('categories', 'subcat', 'subcat.id = booking.subcategoryId')
        .select([
          'event.slug AS eventSlug',
          'booking.id AS bookingId',
          'booking.eventId AS eventId',
          'entertainer.entertainer_name AS entertainerName',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'booking.categoryId AS categoryId',
          'booking.subcategoryId AS subCategoryId',
          'booking.status AS bookingStatus',
          'category.name AS categoryName',
          'subcat.name AS subCategoryName ',
        ])
        .where('booking.eventId IN (:...eventIds)', { eventIds })
        .getRawMany(); // Group by eventId
      const grouped = rawBookings.reduce((acc, row) => {
        const existing = acc.find((e) => e.eventId === row.eventId);
        if (existing) {
          existing.bookings.push({
            bookingId: row.bookingId,
            entertainerName: row.entertainerName,
            categoryName: row.categoryName,
            subCategoryName: row.subCategoryName,
            categoryId: row.categoryId,
            subcategoryId: row.subCategoryId,
            bookingStatus: row.bookingStatus,
            contactPerson: row.contactPerson,
            contactNumber: row.contactNumber,
          });
        } else {
          acc.push({
            eventId: row.eventId,
            eventSlug: row.eventSlug,
            bookings: [
              {
                bookingId: row.bookingId,
                entertainerName: row.entertainerName,
                categoryName: row.categoryName,
                subCategoryName: row.subCategoryName,
                categoryId: row.categoryId,
                subcategoryId: row.subcategoryId,
                bookingStatus: row.bookingStatus,
                contactPerson: row.contactPerson,
                contactNumber: row.contactNumber,
              },
            ],
          });
        }
        return acc;
      }, []);

      return {
        message: 'Entertainer booked for series',
        data: grouped,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
