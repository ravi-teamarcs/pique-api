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
import { format, parse } from 'date-fns';
import { EmailService } from '../Email/email.service';

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
  ) {}

  async createEvent(dto: CreateEventDto) {
    const { neighbourhoodId, ...rest } = dto;
    const obj = structuredClone(dto);
    const { title, venueId, eventDate, startTime } = obj;
    const payload = { title, venueId, eventDate, startTime, neighbourhoodId };
    const slug = await this.generateSlug(payload);
    const event = this.eventRepository.create({
      sub_venue_id: neighbourhoodId,
      slug,
      ...rest,
    });

    const savedEvent = await this.eventRepository.save(event);

    if (!savedEvent) {
      throw new InternalServerErrorException('Error while creating event');
    }

    return { message: 'Event created Successfully', event, status: true };
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
      const updatedEventDate = dto.eventDate ?? event.eventDate;
      let updatedStartTime = dto.startTime ?? event.startTime;

      if (dto.startTime || dto.eventDate) payload['status'] = 'rescheduled';

      if (!(updatedStartTime instanceof Date)) {
        // Try to parse string to Date
        updatedStartTime = new Date(`1970-01-01T${updatedStartTime}`);
      }
      updatedStartTime = format(updatedStartTime, 'HH:mm:ss');
      const slugPayload = {
        title: updatedTitle,
        neighbourhoodId: updatedNeighbourhoodId,
        venueId: updatedVenueId,
        eventDate: updatedEventDate,
        startTime: updatedStartTime,
      };
      const slug = await this.generateSlug(slugPayload);
      payload['slug'] = slug;
      await this.eventRepository.update({ id: eventId }, payload);

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
  async getAllEvents(id: number, page: number = 1, pageSize: number = 20) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const [events, totalCount] = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.venueId =:id', { id })
      .orderBy('event.createdAt', 'DESC')
      .select([
        'event.id',
        'event.title',
        'event.location',
        'event.venueId',
        'event.description',
        'event.startTime',
        'event.endTime',
        'event.recurring',
        'event.status',
        'event.slug',
        'event.eventDate',
      ])
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      message: 'Events fetched successfully',
      count: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      data: events,
      status: true,
    };
  }
  // Api Working
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
    const { neighbourhoodId, title, venueId, eventDate, startTime } = payload;

    const date = new Date(eventDate);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const timeWithoutSeconds = startTime.slice(0, 5);
    const parsedTime = parse(timeWithoutSeconds, 'HH:mm', new Date());

    const time12 = format(parsedTime, 'h:mm a');

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
    const slug = `${formattedDate} at ${time12} ${titleString} at ${neighbourhoodName ?? ''}/${name} in ${city ?? ''},${stateCode ?? ''}`;

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
      .where('event.id = :eventId AND event.venueId = :venueId', {
        eventId: id,
        venueId,
      })
      .select([
        'event.id AS id',
        'event.title AS title',
        'event.description AS description',
        'event.venueId AS venueId',
        'event.eventDate AS eventDate',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.slug AS slug',
        'event.status AS status',
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
    if (status === 'cancelled') {
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .select([
          'user.email AS email',
          'entertainer.name AS entertainerName',
          'event.slug AS slug',
          'event.eventDate AS eventDate',
          'event.startTime AS startTime',
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
              eventDate: format(book.eventDate, 'dd MM yyyy'),
              eventTime: format(book.startTime, 'hh:mm a'),
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
        .select(['venue.name AS venueName', 'venue.id AS venueId'])
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
