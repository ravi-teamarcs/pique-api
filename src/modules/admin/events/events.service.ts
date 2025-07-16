import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';

import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { GetEventDto } from './dto/get-event.dto';
import { ConfigService } from '@nestjs/config';
import { UploadedFile } from 'src/common/types/media.type';
import { Media } from '../media/entities/media.entity';
import { MediaService } from '../media/media.service';
import { EventsQueryDto } from './dto/query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { Venue } from '../venue/entities/venue.entity';
import { BookingService } from '../booking/booking.service';
import { FilterEventDto } from './dto/filter-event.dto';
import { Setting } from '../settings/entities/setting.entity';
import { SubcategoryRate } from '../settings/entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from '../settings/entities/special-subcategory-prices.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,

    @InjectRepository(SubcategoryRate)
    private readonly rateCardRepo: Repository<SubcategoryRate>,
    @InjectRepository(SpecialSubcategoryPrice)
    private readonly specialRateCardRepo: Repository<SpecialSubcategoryPrice>,

    private readonly mediaService: MediaService,
    private readonly bookingService: BookingService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // Create a new event
  async create(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);
    const data = await this.eventRepository.save(event);
    return { message: 'Event Created Successfully', data: event, status: true };
  }

  // New code of Venue Creation with Media
  async createEvent(dto: CreateEventDto) {
    const { neighbourhoodId, ...rest } = dto;
    const obj = structuredClone(dto);
    const { title, venueId, eventStartDateTime, eventEndDateTime } = obj;
    const payload = {
      title,
      venueId,
      eventStartDateTime,
      eventEndDateTime,
      neighbourhoodId,
    };

    const slug = await this.generateSlug(payload);

    try {
      const event = this.eventRepository.create({
        sub_venue_id: neighbourhoodId,
        slug,
        ...rest,
      });

      await this.eventRepository.save(event);

      return {
        message: 'Event created Successfully',
        data: event,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }

  // Get all events
  async findAll({
    page,
    pageSize,
    search,
    status,
  }: {
    page: number;
    pageSize: number;
    search: string;
    status:
      | 'unpublished'
      | 'scheduled'
      | 'confirmed'
      | 'canceled'
      | 'completed'
      | '';
  }): Promise<{
    message: string;
    records: Event[];
    total: number;
    status: boolean;
  }> {
    const skip = (page - 1) * pageSize; // Calculate records to skip

    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .select([
        // Event Details

        'event.id AS id',
        'event.title  AS title',
        'event.status AS status',
        'event.eventStartDateTime AS eventStartDateTime',
        'event.eventEndDateTime AS eventEndDateTime',
        'event.description  AS description',
        'event.slug  AS slug',

        'event.venueId AS venueId',
        'hood.name AS neighbourhood_name',
        'hood.name AS neighbourhood_name',
        'hood.contactPerson AS neighbourhood_contact_person',
        'hood.contactNumber AS neighbourhood_contact_number',
        'hood.id AS neighbourhood_id',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
      ])
      .where(search ? 'event.title LIKE :search' : '1=1', {
        search: `%${search}%`,
      });

    // ✅ Apply status filter only if it's a valid value
    if (status) {
      query.andWhere('event.status = :status', { status });
    }

    const totalCount = await query.getCount();
    const records = await query
      .orderBy('event.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getRawMany(); // ✅ Correct way to fetch raw selected fields

    return {
      message: 'Events fetched successfully',
      records,
      total: totalCount, // Paginated results
      status: true,
    };
  }

  // Get a specific event by id
  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .leftJoin('invoice_events', 'invEvent', 'invEvent.event_id = event.id')
      .leftJoin('invoices', 'inv', 'inv.id = invEvent.invoice_id')

      .select([
        // Event Details
        'event.id AS id',
        'event.title  AS title',
        'event.eventStartDateTime AS eventStartDateTime',
        'event.eventEndDateTime AS eventEndDateTime',
        'event.status AS status',
        'event.description  AS description',
        'event.slug  AS slug',
        'event.venueId AS venueId',
        'hood.name AS neighbourhood_name',
        'hood.name AS neighbourhood_name',
        'hood.contactPerson AS neighbourhood_contact_person',
        'hood.contactNumber AS neighbourhood_contact_number',
        'hood.id AS neighbourhood_id',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'inv.invoice_number AS invoiceNumber',
        'inv.id AS invoiceId',
        'inv.status AS invoiceStatus',
        'inv.isOutdated AS isOutdated',
      ])

      .where('event.id = :id', { id })
      .getRawOne(); // Use getRawOne() for raw results

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  // Update an event by id
  async update(id: number, dto: UpdateEventDto) {
    const { neighbourhoodId, ...rest } = dto;
    const payload = { ...rest };
    if (neighbourhoodId) payload['sub_venue_id'] = neighbourhoodId;

    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new BadRequestException({
        message: 'Event not found',
        status: false,
      });
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
      return { message: 'Event updated successfully', data: dto, status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // Delete an event by id
  async remove(id: number) {
    const event = await this.eventRepository.findOne({ where: { id } });
    await this.eventRepository.remove(event);
    return { message: 'Event deleted Successfully ', status: true };
  }

  async getUpcomingEvent(query: GetEventDto) {
    const { page = 1, pageSize = 5 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);

    try {
      const now = new Date().toISOString().split('T')[0];

      // Step 1: Get total count of events (without join)
      const totalCount = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.eventStartDateTime > :now', { now })
        .getCount();

      // Step 2: Paginate with join and select raw fields
      const results = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .where('event.eventStartDateTime > :now', { now })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.slug AS slug',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS adressLine1',
          'venue.addressLine2 AS adressLine2',
          'city.name AS cityName',
          'state.name AS stateName',
          'code.StateCode AS stateCode',
        ])
        .orderBy('event.eventStartDateTime', 'ASC')
        .offset(skip)
        .limit(Number(pageSize))
        .getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getEventDetailsByMonth(query: EventsQueryDto) {
    const {
      date = '', // e.g., '2025-04'
      page = 1,
      pageSize = 10,
      status = '',
    } = query;

    // If date is not provided, use current year and month
    const current = new Date();
    const year = date ? Number(date.split('-')[0]) : current.getFullYear();
    const month = date ? Number(date.split('-')[1]) : current.getMonth() + 1;

    const skip = (page - 1) * pageSize;

    try {
      const qb = this.eventRepository
        .createQueryBuilder('event')
        .andWhere('YEAR(event.startTime) = :year', { year })
        .andWhere('MONTH(event.startTime) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.userId AS userId',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
        ])
        .orderBy('event.startTime', 'ASC');

      if (status) {
        qb.andWhere('event.status=:status', { status });
      }

      const totalCount = await qb.getCount();
      const results = await qb.skip(skip).take(pageSize).getRawMany();

      return {
        message: 'Events returned successfully',
        data: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
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

    const date = new Date(eventStartDateTime);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const timeUTC = format(new Date(eventStartDateTime), 'HH:mm');

    const { name, neighbourhoodName, city, stateCode } =
      await this.venueRepository
        .createQueryBuilder('venue')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .leftJoin('neighbourhood', 'hood', 'hood.id = :neighbourhoodId', {
          neighbourhoodId,
        })
        .select([
          'venue.id AS id',
          'venue.name AS name',
          'venue.state AS stateId',
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
    const stateString = stateCode ? `, ${stateCode}` : '';

    const slug = `${formattedDate} at ${timeUTC} ${titleString} at ${neighbourhoodNameString}${name} in ${city ?? ''}${stateString}`;

    return slug;
  }

  async findBookings(eventId: number) {
    try {
      const events = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
        .leftJoin('categories', 'subcat', 'subcat.id = booking.subcategoryId')
        .leftJoin(
          (subQuery) =>
            subQuery
              .select('bl.*')
              .from(
                (qb) =>
                  qb
                    .subQuery()
                    .select('MAX(bl.id)', 'maxId')
                    .addSelect('bl.bookingId', 'bookingId')
                    .from('booking_log', 'bl')
                    .where('bl.status IN (:...statuses)', {
                      statuses: ['confirmed', 'completed'],
                    })

                    .andWhere('bl.performedBy IN (:...performedBy)', {
                      performedBy: ['admin', 'venue'],
                    })
                    .groupBy('bl.bookingId'),
                'latestLogs',
              )
              .innerJoin('booking_log', 'bl', 'bl.id = latestLogs.maxId'),
          'log',
          'log.bookingId = booking.id',
        )
        .select([
          'booking.id AS bookingId',
          'booking.status AS bookingStatus',
          'booking.categoryId AS categoryId',
          'booking.subcategoryId AS subcategoryId',
          'subcat.name AS subCategoryName',
          'ent.name AS entertainerName',
          'ent.contact_person AS contactPerson',
          'ent.contact_number AS contactNumber',

          'log.createdAt AS confirmationDate',
          'log.performedBy AS performedBy',
        ])
        .where('booking.eventId = :eventId', { eventId })
        .orderBy('booking.id', 'DESC');

      const totalCount = await events.getCount();
      const results = await events.getRawMany();

      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      // Rate Card Repo
      const rateCard = await this.rateCardRepo.find();

      let formattedDate = new Date(event.eventStartDateTime)
        .toISOString()
        .split('T')[0];

      const specialRateCard = await this.specialRateCardRepo.find({
        where: { date: formattedDate },
      });

      // Now map the results to include the price with markup
      if (!results || results.length === 0) return;

      const updatedResults = await Promise.all(
        results.map(async (result) => {
          let price: number;
          let pricePerExtra30Min: number;

          if (specialRateCard.length > 0) {
            let res = specialRateCard.find(
              (item) => item.subcategoryId === result.subcategoryId,
            );

            price = res.specialPrice;
            pricePerExtra30Min = res.pricePerExtra30Min;
          } else {
            let res = rateCard.find(
              (item) => item.subcategoryId === result.subcategoryId,
            );
            price = res.basePrice;
            pricePerExtra30Min = res.pricePerExtra30Min;
          }

          // const priceWithMarkup = await this.addMarkupToEntertainer(
          //   Number(price),
          // );
          return {
            ...result,
            pricePerHour: price,
            pricePerExtra30Min,
          };
        }),
      );

      return {
        message: `Bookings for Event Id ${eventId} fetched successfully`,
        data: updatedResults,
        totalCount,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateEventStatus(id: number, status) {
    try {
      const event = await this.eventRepository.findOne({ where: { id } });
      if (!event) throw new NotFoundException({ message: 'Event Not Found' });

      await this.eventRepository.update({ id: event.id }, { status });
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async filterEventsByMonthAndYear(query: FilterEventDto) {
    const { month, year } = query;

    try {
      const start = format(
        startOfMonth(new Date(year, month - 1)),
        'yyyy-MM-dd',
      );
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const events = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.eventStartDateTime BETWEEN :start AND :end', {
          start,
          end,
        })
        .orderBy('event.id', 'DESC')
        .getMany();

      return {
        message: 'Filtered events returned successfully',
        data: events,
        count: events.length,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  private async addMarkupToEntertainer(basePrice: number) {
    const res = await this.settingRepo.findOne({ where: { isActive: true } });
    if (!res) return basePrice;
    const { markupType, markupValue } = res;

    let finalPrice =
      markupType === 'fixed'
        ? basePrice + markupValue
        : basePrice + (markupValue / 100) * basePrice;
    return finalPrice;
  }
}
