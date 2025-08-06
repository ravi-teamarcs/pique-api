import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { VenueEvent } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Venue } from '../venue/entities/venue.entity';
import { format, startOfDay } from 'date-fns';
import { format as formatTz } from 'date-fns-tz';
import { EmailService } from '../Email/email.service';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly emailService: EmailService,
    private readonly bookingService: BookingService,
  ) {}

  async createEvent(dto: CreateEventDto) {
    try {
      const { neighbourhoodId, ...rest } = dto;
      const obj = structuredClone(dto);
      const { title, venueId, eventStartDateTime, eventEndDateTime } = obj;
      console.log(new Date(eventStartDateTime));
      const payload = {
        title,
        venueId,
        eventStartDateTime,
        eventEndDateTime,
        neighbourhoodId,
      };
      const slug = await this.generateSlug(payload);
      const event = this.eventRepository.create({
        sub_venue_id: neighbourhoodId,
        slug,
        ...rest,
      });

      const savedEvent = await this.eventRepository.save(event);
      return { message: 'Event created Successfully', event, status: true };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async handleUpdateEvent(dto: any, venueId: number) {
    const { eventId, neighbourhoodId, ...rest } = dto;
    const payload = { ...rest };
    if (neighbourhoodId) payload['sub_venue_id'] = neighbourhoodId;

    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
    });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    try {
      const updatedNeighbourhoodId = neighbourhoodId ?? event.sub_venue_id;
      const updatedVenueId = dto.venueId ?? event.venueId;
      const updatedTitle = dto.title ?? event.title;
      const updatedEventDate =
        dto.eventStartDateTime ?? event.eventStartDateTime;
      let updatedStartTime = dto.eventStartDateTime ?? event.eventStartDateTime;

      updatedStartTime = format(updatedStartTime, 'HH:mm:ss');
      const slugPayload = {
        title: updatedTitle,
        neighbourhoodId: updatedNeighbourhoodId,
        venueId: updatedVenueId,
        eventStartDateTime: updatedEventDate,
        eventEndDateTime: dto.eventEndDateTime ?? event.eventEndDateTime,
      };
      const slug = await this.generateSlug(slugPayload);
      payload['slug'] = slug;

      const hasStartDateTimeChanged =
        dto.eventStartDateTime &&
        dto.eventStartDateTime !==
          format(
            new Date(event.eventStartDateTime),
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
          );

      const hasEndDateTimeChanged =
        dto.eventEndDateTime &&
        dto.eventEndDateTime !==
          format(new Date(event.eventEndDateTime), "yyyy-MM-dd'T'HH:mm:ss'Z'");

      if (hasStartDateTimeChanged || hasEndDateTimeChanged) {
        payload['status'] = 'rescheduled';
      }
      await this.eventRepository.update({ id: event.id }, payload);

      if (hasStartDateTimeChanged || hasEndDateTimeChanged) {
        this.bookingService.handleChangeRequest(Number(event.id), {
          eventStartDateTime: dto.eventStartDateTime,
          eventEndDateTime: dto.eventEndDateTime,
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
  // Created for venues
  // async getAllEvents(id: number, page: number = 1, pageSize: number = 20) {
  //   try {
  //     const today = startOfDay(new Date());
  //     const skip = (Number(page) - 1) * Number(pageSize);
  //     const take = Number(pageSize);
  //     const [events, totalCount] = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
  //       .where('event.venueId = :id', { id })
  //       .orderBy('event.createdAt', 'DESC')
  //       .select([
  //         'event.id',
  //         'event.title',
  //         'event.location',
  //         'event.venueId',
  //         'event.description',
  //         'event.startTime',
  //         'event.endTime',
  //         'event.recurring',
  //         'event.status',
  //         'event.slug',
  //         'event.createdAt',
  //         'event.eventDate',
  //         'hood.id',
  //         'hood.name',
  //       ])
  //       .take(take)
  //       .skip(skip)
  //       .getManyAndCount();

  //     return {
  //       message: 'Events fetched successfully',
  //       count: totalCount,
  //       page,
  //       pageSize,
  //       totalPages: Math.ceil(totalCount / Number(pageSize)),
  //       data: events,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  async getAllEvents(id: number, page: number = 1, pageSize: number = 10) {
    try {
      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const events = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .where('event.venueId = :id', { id })
        .orderBy('event.createdAt', 'DESC')
        .select([
          'event.id AS id',
          'event.title AS title',
          'event.location AS location',
          'event.venueId AS venueId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          // Added two new Fields
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',

          'event.recurring AS recurring',
          'event.status AS status',
          'event.slug AS slug',
          'event.eventDate AS eventDate',
          'event.createdAt AS createdAt',
          'hood.id AS neighbourhoodId',
          'hood.name AS neighbourhoodName',
        ])
        .limit(take)
        .offset(skip)
        .getRawMany(); // ← this returns raw data with aliases

      const totalCount = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.venueId = :id', { id })
        .getCount();
      return {
        message: 'Events fetched successfully',
        count: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        data: events,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  //   try {
  //     const today = startOfDay(new Date());
  //     const skip = (Number(page) - 1) * Number(pageSize);
  //     const take = Number(pageSize);

  //     const [events, totalCount] = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
  //       .where('event.venueId = :id', { id })
  //       .orderBy('event.createdAt', 'DESC')
  //       .select([
  //         'event.id',
  //         'event.title',
  //         'event.location',
  //         'event.venueId',
  //         'event.description',
  //         'event.startTime',
  //         'event.endTime',
  //         'event.recurring',
  //         'event.status',
  //         'event.slug',
  //         'event.eventDate',
  //         'event.createdAt', // ✅ Fix: include this because you're ordering by it
  //         'hood.id AS neighbourhoodId',
  //       ])
  //       .take(take)
  //       .skip(skip)
  //       .getManyAndCount();

  //     return {
  //       message: 'Events fetched successfully',
  //       count: totalCount,
  //       page,
  //       pageSize,
  //       totalPages: Math.ceil(totalCount / Number(pageSize)),
  //       data: events,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  // async getAllEvents(id: number, page: number = 1, pageSize: number = 20) {
  //   try {
  //     const skip = (Number(page) - 1) * Number(pageSize);
  //     const take = Number(pageSize);
  //     const events = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
  //       .where('event.venueId = :id', { id })
  //       .orderBy('event.createdAt', 'DESC')
  //       .select([
  //         'event.id',
  //         'event.title',
  //         'event.location',
  //         'event.venueId',
  //         'event.description',
  //         'event.startTime',
  //         'event.endTime',
  //         'event.recurring',
  //         'event.status',
  //         'event.slug',
  //         'event.eventDate',
  //         'event.createdAt',
  //         'hood.id AS neighbourhoodId',
  //         'hood.name AS neighbourhoodName',
  //       ])
  //       .limit(take)
  //       .offset(skip)
  //       .getRawMany(); // ← this returns raw data with aliases
  //     const totalCount = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .where('event.venueId = :id', { id })
  //       .getCount();
  //     return {
  //       message: 'Events fetched successfully',
  //       count: totalCount,
  //       page,
  //       pageSize,
  //       totalPages: Math.ceil(totalCount / Number(pageSize)),
  //       data: events,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  // Api Working
  async getEventListDropdown(id: number) {
    try {
      const today = startOfDay(new Date());

      const [events, totalCount] = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.venueId = :id', { id })
        .andWhere('event.eventStartDateTime >= :today', { today })
        .andWhere('event.status IN (:...status)', {
          status: ['confirmed', 'rescheduled', 'invited', 'unpublished'],
        })
        .orderBy('event.createdAt', 'DESC')
        .select([
          'event.id',
          'event.title',
          'event.location',
          'event.venueId',
          'event.description',
          'event.startTime',
          'event.endTime',
          'event.eventStartDateTime',
          'event.eventEndDateTime',
          'event.endTime',
          'event.recurring',
          'event.status',
          'event.slug',
          'event.eventDate',
        ])
        .getManyAndCount();

      return {
        message: 'Events dropdown list fetched successfully',
        count: totalCount,
        data: events,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message); // fixed typo
    }
  }

  async deleteEvent(venueId: number, eventId: number) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
    });
    if (!event) {
      throw new BadRequestException({
        message: 'Event not found',
        status: false,
      });
    }
    try {
      const res = await this.eventRepository.remove(event);
      return { message: 'Event deleted successfully', data: res, status: true };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async generateSlug(payload) {
    const {
      neighbourhoodId,
      title,
      venueId,
      eventStartDateTime,
      startEndDateTime,
    } = payload;

    const date = new Date(eventStartDateTime);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const timeUTC = format(new Date(eventStartDateTime), 'HH:mm');

    const { name, neighbourhoodName, city, stateCode } =
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
          'city.name AS city',
          'code.StateCode AS stateCode',
          'hood.name AS neighbourhoodName',
          'hood.contactPerson AS neighbourhood_contact_person',
          'hood.contactNumber AS neighbourhood_contact_number',
        ])
        .where('venue.id = :id', { id: venueId })
        .getRawOne();

    const titleString = title ? `(${title})` : '';
    const neighbourhoodNameString = neighbourhoodName
      ? `${neighbourhoodName}/`
      : '';
    const stateString = stateCode ? `, ${stateCode})` : '';

    const slug = `${formattedDate} at ${timeUTC} ${titleString} at ${neighbourhoodNameString}${name} in ${city ?? ''}${stateString}`;

    return slug;
  }

  // event.service.ts
  async updateEventStatus(eventId: number, venueId: number, status) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, venueId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    try {
      await this.eventRepository.update({ id: event.id }, { status });
      await this.checkStatusAndSendEmail(status, eventId);
      return {
        message: `Event with ${eventId} updated Successfully`,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEventById(id: number, venueId: number) {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .where('event.id = :eventId AND event.venueId = :venueId', {
        eventId: id,
        venueId,
      })
      .select([
        'event.id AS id',
        'event.title AS title',
        'event.description AS description',
        'event.venueId AS venueId',
        'event.eventStartDateTime AS eventStartDateTime',
        'event.eventEndDateTime AS eventEndDateTime',
        'event.endTime AS endTime',
        'event.slug AS slug',
        'event.status AS status',
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.timezone AS venueTimeZone',
        'hood.id AS neighbourhoodId',
        'hood.name AS neighbourhoodName',
        'hood.contactPerson AS contactPerson',
        'hood.contactNumber AS contactName',
      ])
      .getRawOne();

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    return {
      message: 'Event returned successfully',
      status: true,
      data: event,
    };
  }

  private async checkStatusAndSendEmail(status, eventId: number) {
    if (status === 'canceled') {
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .select([
          'user.email AS email',
          'entertainer.name AS entertainerName',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS  eventEndDateTime',
          'venue.timezone AS venueTimeZone',
        ])
        .where('booking.eventId = :eventId', { eventId })
        .getRawMany();

      for (const book of bookings) {
        if (book.email) {
          const emailPayload = {
            to: book.email,
            subject: `Event ${status}`,
            templateName: 'cancelled-event-template.html',
            replacements: {
              eventName: book.slug,
              eventDate: formatTz(book.eventStartDateTime, 'dd MMM yyyy z', {
                timeZone: book.venueTimeZone ?? 'UTC',
              }),
              eventTime: formatTz(book.eventStartDateTime, 'HH:mm', {
                timeZone: book.venueTimeZone ?? 'UTC',
              }),
              year: new Date().getFullYear(),
            },
          };
          this.emailService.handleSendEmail(emailPayload);
        }
      }
    }
  }

  async getVenueDetailsById(id: number) {
    try {
      const venueDetails = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId ')
        .select([
          'venue.name AS venueName',
          'venue.id AS venueId',
          'venue.timezone AS venueTimeZone',
        ])
        .where('event.id =:id', { id })
        .getRawOne();

      return {
        message: 'Venue Detail Fetched Successfully',
        data: venueDetails,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
