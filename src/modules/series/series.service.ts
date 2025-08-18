import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VenueEvent } from '../event/entities/event.entity';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { nowUtc } from 'src/common/utils/common.utils';
import { startOfDay } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}
  async getUpcomingEventForSeries(id: number) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { id },
        select: ['id', 'timezone'],
      });

      const event = await this.eventRepository.find({
        where: {
          venueId: venue.id,
          eventStartDateTime: MoreThan(nowUtc()),
        },
        select: [
          'id',
          'venueId',
          'eventStartDateTime',
          'eventEndDateTime',
          'slug',
        ],
        order: {
          id: 'DESC',
        },
      });

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
}
