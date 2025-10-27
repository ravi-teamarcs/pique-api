import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VenueEvent } from '../event/entities/event.entity';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { nowUtc } from 'src/common/utils/common.utils';
import { startOfDay } from 'date-fns';
import {
  format,
  formatInTimeZone,
  utcToZonedTime,
  zonedTimeToUtc,
} from 'date-fns-tz';
import { Series } from './entities/series.entity';
import { SeriesDto } from './dto/series.dto';
import { throwError } from 'rxjs';
import { Status } from 'src/common/enums/event.enum';
import { Booking } from '../booking/entities/booking.entity';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly bookingService: BookingService,
  ) {}
  async getUpcomingEventForSeries(id: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { id },
        select: ['id', 'timezone'],
      });

      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('series', 'series', 'series.id = event.series_id')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .leftJoin('categories', 'cat', 'cat.id = event.category_id')
        .leftJoin('categories', 'subcat', 'subcat.id = event.subcategory_id')
        .select([
          'event.id AS id',
          'event.description AS description',
          'event.title AS title',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.title AS eventTitle',
          'event.categoryId AS categoryId',
          'event.subCategoryId AS subCategoryId',
          'cat.name AS categoryName',
          'subcat.name AS subCategoryName',
          'event.series_id AS seriesId',
          'series.seriesName AS seriesName',
          'venue.name AS venueName',
          'event.status AS eventStatus',
          'venue.addressLine1 AS venueAddressLine1',
          'venue.addressLine2 AS venueAddressLine2',
          'hood.id AS neighbourHoodId',
          'hood.name AS neighbourHoodName',
        ])
        .where('event.venueId = :venueId', { venueId: venue.id })
        .andWhere('event.eventStartDateTime >= :time ', {
          time: nowUtc().toISOString(),
        })
        .andWhere('event.status IN (:...statuses)', {
          statuses: ['unpublished', 'invited', 'rescheduled', 'confirmed'],
        })
        .andWhere('event.series_id IS NULL')
        .orderBy('DATE(event.eventStartDateTime)', 'ASC')
        .getRawMany();

      const parsedResult = event.map(
        ({ eventStartDateTime, eventEndDateTime, ...rest }) => {
          const eventStart = utcToZonedTime(eventStartDateTime, venue.timezone);
          const eventEnd = utcToZonedTime(eventEndDateTime, venue.timezone);

          return {
            ...rest,
            eventStartDateTimeLocal: format(
              eventStart,
              'yyyy-MM-dd hh:mm a z',
              {
                timeZone: venue.timezone ?? 'UTC',
              },
            ),
            eventStartDateTime,
            eventEndDateTimeLocal: format(eventEnd, 'yyyy-MM-dd hh:mm a z', {
              timeZone: venue.timezone ?? 'UTC',
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

  async createSeries(payload: SeriesDto) {
    const { seriesName, venueId, events, existingEvents } = payload;
    try {
      const seriesPayload = { seriesName, venueId };

      // check for same name series exist throw error
      const duplicateName = await this.seriesRepository.findOne({
        where: { seriesName: seriesName.trim() },
      });

      if (duplicateName)
        throw new BadRequestException('Series with name already exists');

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
        for (const event of existingEvents) {
          const existingPayload = { series: { id: savedSeries.id }, ...event };
          await this.handleUpdateEventExisting(existingPayload, venueId);
          // await this.addExistingEventToSeries(eventId, savedSeries.id);
        }
      }
      return {
        message: 'Series created successfully',
        status: true,
        data: savedSeries,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllSeriesOfVenue(venueId: number) {
    try {
      const series = await this.seriesRepository.find({
        where: { venueId },
        relations: ['events'],
        order: {
          events: {
            eventStartDateTime: 'ASC',
          },
        },
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

  async getSeriesById(id: number, venueId: number) {
    let response: any;
    try {
      const series = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoinAndSelect('series.events', 'event', 'event.venueId = :venueId')
        .where('series.id = :id', { id })
        .andWhere('series.venueId = :venueId', { venueId })
        .orderBy('event.eventStartDateTime', 'ASC')
        .getOne();
      response = series;

      if (!series) {
        const adminSeries = await this.seriesRepository
          .createQueryBuilder('series')
          .leftJoinAndSelect(
            'series.events',
            'event',
            'event.venueId = :venueId',
            { venueId },
          )
          .where('series.id = :id', { id })
          .orderBy('event.eventStartDateTime', 'ASC')
          .getOne();

        if (!(series || adminSeries))
          throw new BadRequestException('series not found');
        response = adminSeries;
      }
      const venueTimeZone = await this.venueRepository.findOne({
        where: { id: venueId },
        select: ['timezone'],
      });
      response['venueTimeZone'] = venueTimeZone.timezone;

      return {
        message: 'series returned successfully',
        data: response,
        status: true,
      };
    } catch (error) {
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
        categoryId,
        subCategoryId,
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
        categoryId,
        subCategoryId,
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

  async addExistingEventToSeries(
    eventId: number,
    seriesId: number,
    venueId: number,
  ) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId, venueId },
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

  async removeEventFromSeries(id: number, seriesId: number) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id, series: { id: seriesId } },
      });
      if (!event) throw new NotFoundException('Event not found');

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

  async removeSeriesAndEvents(seriesId: number, venueId: number) {
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

  async updateSeries(venueId: number, payload) {
    try {
      const { seriesName, events, seriesId, existingEvents, updatedEvents } =
        payload;

      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
      });

      if (!series) throw new NotFoundException('series not found');

      await this.seriesRepository.update(
        { id: series.id },
        { seriesName, venueId },
      );

      if (events && events.length > 0) {
        const newRecords = events.map((event: any) => {
          return {
            ...event,
            seriesId: series.id,
            venueId,
          };
        });
        for (const event of newRecords) {
          await this.addNewEventToSeries(event);
        }
      }

      if (existingEvents && existingEvents.length > 0) {
        for (const event of existingEvents) {
          const existingPayload = { series: { id: seriesId }, ...event };
          await this.handleUpdateEventExisting(existingPayload, venueId);
          // await this.addExistingEventToSeries(eventId, savedSeries.id);
        }
      }

      for (const event of updatedEvents) {
        // Need to use external Service
        await this.handleUpdateEvent(event, venueId);
      }

      return { message: 'Series updated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async handleUpdateEvent(dto: any, venueId: number) {
    const {
      title,
      description,
      id: eventId,
      neighbourhoodId,
      eventStartDateTime,
      eventEndDateTime,
      categoryId,
      subCategoryId,
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
        categoryId,
        subCategoryId,
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
  async handleUpdateEventExisting(dto: any, venueId: number) {
    const {
      title,
      description,
      id: eventId,
      neighbourhoodId,
      eventStartDateTime,
      eventEndDateTime,
      categoryId,
      subCategoryId,
      series,
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
        categoryId,
        subCategoryId,
        series,
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
          'entertainer.id AS entertainerId',
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
            entertainerId: Number(row.entertainerId),
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
                entertainerId: Number(row.entertainerId),
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
