import {
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
import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Series } from './entities/series.entity';
import { SeriesDto } from './dto/series.dto';
import { throwError } from 'rxjs';
import { Status } from 'src/common/enums/event.enum';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
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
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .select([
          'event.id AS id',
          'event.description AS description',
          'event.title AS title',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.title AS eventTitle',
          'venue.name AS venueName',
          'venue.addressLine1 AS venueAddressLine1',
          'venue.addressLine1 AS venueAddressLine2',
          'hood.id AS neighbourHoodId',
          'hood.name AS neighbourHoodName',
        ])
        .where('event.venueId = :venueId', { venueId: venue.id })
        .andWhere('event.eventStartDateTime >= :time ', { time: nowUtc() })
        .orderBy('event.id', 'DESC')
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
    const { seriesName, venueId, events } = payload;
    try {
      const seriesPayload = { seriesName, venueId };
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
      return {
        message: 'Series created successfully',
        status: true,
        data: savedSeries,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllSeriesOfVenue(venueId: number) {
    try {
      const series = await this.seriesRepository.find({
        where: { venueId },
        relations: ['events']
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
    try {
      const series = await this.seriesRepository.findOne({
        where: { id, venueId },
      });
      if (!series) throw new NotFoundException('Series Not Found');

      return {
        message: 'series returned Successfully',
        data: series,
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

  async removeSeriesAndEvents(seriesId: number, venueId: number) {
    try {
      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
      });
      if (!series) throw new NotFoundException('Series not Found');
      await this.seriesRepository.remove(series);

      const events = await this.eventRepository.find({
        where: { series: { id: series.id }, venueId },
      });
      if (events && events.length > 0) {
        for (const event of events) {
          await this.eventRepository.remove(event);
        }
      }
      return { message: 'Series and Event deleted Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
