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
import { Categories } from '../entertainer/entities/Category.entity';
import { Neighbourhood } from '../venue/entities/neighbourhood.entity';
import { EventCategorySubcategory } from '../events/entities/event-category-subcategory.entity';
import { AnyARecord } from 'dns';

@Injectable()
export class AdminSeriesService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    @InjectRepository(Categories)
    private readonly categoryRepository: Repository<Categories>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourhoodRepository: Repository<Neighbourhood>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,
    private readonly bookingService: BookingService,
  ) {}

  async getUpcomingEventForSeries() {
    try {
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .leftJoin('categories', 'cat', 'cat.id = event.category_id')
        .leftJoin('categories', 'subcat', 'subcat.id = event.subcategory_id')
        .select([
          'event.id AS id',
          'event.description AS description',
          'event.title AS title',
          'event.slug AS slug',
          'event.status AS eventStatus',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.categoryId AS categoryId',
          'event.subCategoryId AS subCategoryId',
          'cat.name AS categoryName',
          'subcat.name AS subCategoryName',
          'event.title AS eventTitle',
          'event.series_id AS seriesId',
          'venue.id AS venueId',
          'venue.name AS venueName',
          'venue.addressLine1 AS venueAddressLine1',
          'venue.addressLine2 AS venueAddressLine2',
          'venue.timezone AS venueTimeZone',
          'hood.id AS neighbourHoodId',
          'hood.name AS neighbourHoodName',
        ])
        .addSelect(
          `
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'categoryId', c.id,
        'categoryName', c.name,
        'subCategories', (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'subCategoryId', sc.id,
              'subCategoryName', sc.name
            )
          )
          FROM event_category_subcategory ecs2
          JOIN categories sc ON sc.id = ecs2.subcategory_id
          WHERE ecs2.event_id = event.id
            AND ecs2.category_id = c.id
        )
      )
    )
    FROM (
      SELECT DISTINCT ecs.category_id, ecs.event_id
      FROM event_category_subcategory ecs
    ) uniq
    JOIN categories c ON c.id = uniq.category_id
    WHERE uniq.event_id = event.id
  ) AS categories
`,
        )
        .where('event.eventStartDateTime >= NOW()')
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
            categories: rest.categories ? JSON.parse(rest.categories) : [],
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
          await this.handleUpdateEventExisting(existingPayload);
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

  async getAllSeries(query:any) {
    try {
      const { page = 1, pageSize = 100, search } = query;

      const skip = (page - 1) * pageSize;

      const [series, totalCount] = await this.seriesRepository.findAndCount({
        relations: ['events'],
        skip,
        take: pageSize,
        order: { id: 'DESC' }, // optional, but recommended for stable pagination
      });

      return {
        message: 'Series returned successfully',
        data: series,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / pageSize),
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

  // async getSeriesById(id: number) {
  //   try {
  //     const series = await this.seriesRepository.findOne({
  //       where: { id },
  //       relations: ['events'],
  //     });
  //     if (!series) throw new NotFoundException('Series Not Found');

  //     const parsedResult = await Promise.all(
  //       series?.events?.map(async (event: any) => {
  //         const venue = await this.venueRepository.findOne({
  //           where: { id: event.venueId },
  //           select: ['timezone'],
  //         });
  //         const category = await this.categoryRepository.findOne({
  //           where: { id: event.categoryId },
  //           select: ['name'],
  //         });
  //         const subCategory = await this.categoryRepository.findOne({
  //           where: { id: event.subCategoryId },
  //           select: ['name'],
  //         });
  //         const neighbourhood = await this.neighbourhoodRepository.findOne({
  //           where: { id: event.sub_venue_id },
  //           select: ['name'],
  //         });
  //         return {
  //           ...event,
  //           categoryName: category?.name,
  //           subCategoryName: subCategory?.name,
  //           neighbourhoodName: neighbourhood?.name,
  //           venueTimeZone: venue.timezone || 'UTC',
  //         };
  //       }),
  //     );
  //     const returnPayload = {
  //       id: series.id,
  //       seriesName: series.seriesName,
  //       events: parsedResult,
  //     };
  //     return {
  //       message: 'series returned Successfully',
  //       data: returnPayload,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  async getSeriesById(seriesId: number) {
    try {
      // Step 1: Load series and its events
      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
        relations: ['events'],
      });

      if (!series) {
        throw new NotFoundException(`Series ${seriesId} not found`);
      }

      // Step 2: Get all event IDs from that series
      const eventIds = series.events.map((e: any) => e.id);
      if (!eventIds.length) {
        return { ...series, events: [] };
      }

      // Step 3: Load categories + subcategories per event
      const categoryData = await this.eventCategoriesRepository.query(
        `
  SELECT 
    ecs.event_id AS eventId,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'categoryId', cat.id,
        'categoryName', cat.name,
        'subCategories', cat_data.subCategories
      )
    ) AS categories
  FROM (
    SELECT DISTINCT event_id, category_id
    FROM event_category_subcategory
    WHERE event_id IN (?)
  ) ecs
  JOIN categories cat ON cat.id = ecs.category_id
  JOIN (
    SELECT 
      ecs_inner.event_id,
      ecs_inner.category_id,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'subCategoryId', subcat.id,
          'subCategoryName', subcat.name
        )
      ) AS subCategories
    FROM event_category_subcategory ecs_inner
    JOIN categories subcat ON subcat.id = ecs_inner.subcategory_id
    GROUP BY ecs_inner.event_id, ecs_inner.category_id
  ) AS cat_data
    ON cat_data.event_id = ecs.event_id AND cat_data.category_id = ecs.category_id
  GROUP BY ecs.event_id
  `,
        [eventIds],
      );

      // Step 4: Convert result → map for quick lookup
      const categoryMap = new Map<number, any>();
      for (const row of categoryData) {
        categoryMap.set(row.eventId, JSON.parse(row.categories));
      }

      // Step 5: Attach categories to each event
      const enrichedEvents = series.events.map((event: any) => ({
        ...event,
        categories: categoryMap.get(event.id) || [],
      }));

      return {
        id: series.id,
        seriesName: series.seriesName,
        events: enrichedEvents,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
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
        categories,
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

      const eventCategoryRecords = [];
      for (const cat of categories) {
        for (const subCatId of cat.subCategoryIds) {
          eventCategoryRecords.push({
            event: { id: savedEvent.id },
            categoryId: cat.categoryId,
            subCategoryId: subCatId,
          });
        }
      }

      await this.eventCategoriesRepository.save(eventCategoryRecords);

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
        for (const event of existingEvents) {
          const existingPayload = { series: { id: seriesId }, ...event };
          await this.handleUpdateEventExisting(existingPayload);
          // await this.addExistingEventToSeries(eventId, savedSeries.id);
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
      id: eventId,
      venueId,
      neighbourhoodId,
      eventStartDateTime,
      eventEndDateTime,
      categories,
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
      if (categories.length > 0) {
        await this.eventCategoriesRepository.delete({
          event: { id: event.id },
        });
        const eventCategoryRecords = [];
        for (const cat of categories) {
          for (const subCatId of cat.subCategoryIds) {
            eventCategoryRecords.push({
              event: { id: event.id },
              categoryId: cat.categoryId,
              subCategoryId: subCatId,
            });
          }
        }

        await this.eventCategoriesRepository.save(eventCategoryRecords);
      }

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
  async handleUpdateEventExisting(dto: any) {
    const {
      title,
      description,
      id: eventId,
      venueId,
      neighbourhoodId,
      eventStartDateTime,
      eventEndDateTime,
      categories,
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
        series,
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
      if (categories.length > 0) {
        await this.eventCategoriesRepository.delete({
          event: { id: event.id },
        });
        const eventCategoryRecords = [];
        for (const cat of categories) {
          for (const subCatId of cat.subCategoryIds) {
            eventCategoryRecords.push({
              event: { id: event.id },
              categoryId: cat.categoryId,
              subCategoryId: subCatId,
            });
          }
        }

        await this.eventCategoriesRepository.save(eventCategoryRecords);
      }

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
          'booking.status AS bookingstatus',
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
            entertainerId: Number(row.entertainerId),
            categoryName: row.categoryName,
            subCategoryName: row.subCategoryName,
            categoryId: row.categoryId,
            subcategoryId: row.subCategoryId,
            bookingstatus: row.bookingstatus,
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
                entertainerId: Number(row.entertainerId),
                categoryId: row.categoryId,
                subcategoryId: row.subcategoryId,
                bookingstatus: row.bookingstatus,
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

  async removeEntertainerFromSeries(
    seriesId: number,
    entertainerIds: number[],
  ) {
    try {
      const series = await this.seriesRepository.findOne({
        where: { id: seriesId },
      });

      if (!series) throw new NotFoundException('series not found');
      const events = await this.eventRepository.find({
        where: { series: { id: seriesId } },
        select: ['id'],
      });
      if (events && events.length === 0)
        return { messsage: 'No events to remove entertainer', status: true };

      const eventIds = events.map((event: Event): number => event?.id);
      for (const eventId of eventIds) {
        const bookings = await this.bookingRepository
          .createQueryBuilder('booking')
          .select(['booking.id AS bookingId'])
          .where('booking.entId IN (:...entIds)', { entIds: entertainerIds })
          .andWhere('booking.eventId = :eventId', { eventId })
          .getRawMany();

        if (bookings && bookings.length === 0) continue;

        for (const booking of bookings) {
          await this.bookingRepository.update(
            { id: booking.bookingId },
            { status: 'removed' },
          );
        }
      }
      return {
        message: 'Entertainers removed from series succcessfully',
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
