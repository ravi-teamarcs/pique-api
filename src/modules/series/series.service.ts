import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VenueEvent } from '../event/entities/event.entity';
import { In, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
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
import { EventCategorySubcategory } from '../event/entities/event-category-subcategory.entity';
import { Category } from '../entertainer/entities/categories.entity';

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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,
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
            categories: rest.categories ? JSON.parse(rest.categories) : [],
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

  // async getAllSeriesOfVenue(venueId: number) {
  //   try {
  //     const series = await this.seriesRepository.find({
  //       where: { venueId },
  //       relations: ['events'],
  //       order: {
  //         events: {
  //           eventStartDateTime: 'ASC',
  //         },
  //       },
  //     });
  //     return {
  //       message: 'series returned Successfully',
  //       data: series,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  // async getSeriesById(id: number, venueId: number) {
  //   let response: any;
  //   try {
  //     const series = await this.seriesRepository
  //       .createQueryBuilder('series')
  //       .leftJoinAndSelect('series.events', 'event', 'event.venueId = :venueId')
  //       .where('series.id = :id', { id })
  //       .andWhere('series.venueId = :venueId', { venueId })
  //       .orderBy('event.eventStartDateTime', 'ASC')
  //       .getOne();
  //     response = series;

  //     if (!series) {
  //       const adminSeries = await this.seriesRepository
  //         .createQueryBuilder('series')
  //         .leftJoinAndSelect(
  //           'series.events',
  //           'event',
  //           'event.venueId = :venueId',
  //           { venueId },
  //         )
  //         .where('series.id = :id', { id })
  //         .orderBy('event.eventStartDateTime', 'ASC')
  //         .getOne();

  //       if (!(series || adminSeries))
  //         throw new BadRequestException('series not found');
  //       response = adminSeries;
  //     }
  //     const venueTimeZone = await this.venueRepository.findOne({
  //       where: { id: venueId },
  //       select: ['timezone'],
  //     });
  //     response['venueTimeZone'] = venueTimeZone.timezone;

  //     return {
  //       message: 'series returned successfully',
  //       data: response,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  // async getAllSeriesOfVenue(venueId: number) {
  //   try {
  //     // 1️⃣ Fetch all series with their events
  //     const seriesList = await this.seriesRepository.find({
  //       where: { venueId },
  //       relations: ['events'],
  //       order: {
  //         events: {
  //           eventStartDateTime: 'ASC',
  //         },
  //       },
  //     });

  //     if (!seriesList.length) {
  //       return {
  //         message: 'series returned successfully',
  //         data: [],
  //         status: true,
  //       };
  //     }

  //     // 2️⃣ Collect all event IDs
  //     const allEventIds = seriesList.flatMap((series) =>
  //       (series.events || []).map((event: any) => event.id),
  //     );

  //     // 3️⃣ Fetch event-category mappings (plain columns only)
  //     const eventCategoryMappings = allEventIds.length
  //       ? await this.eventCategoriesRepository.find({
  //           where: { event: { id: In(allEventIds) } }, // eventId is plain column now
  //           relations: ['event'],
  //           select: ['event', 'categoryId', 'subCategoryId'],
  //         })
  //       : [];

  //     // 4️⃣ Collect all unique category and subcategory IDs
  //     const allCategoryIds = [
  //       ...new Set(eventCategoryMappings.map((m) => m.categoryId)),
  //     ];
  //     const allSubCategoryIds = [
  //       ...new Set(eventCategoryMappings.map((m) => m.subCategoryId)),
  //     ];

  //     // 5️⃣ Fetch names from `categories` and `specific_categories` tables
  //     const [categories, subcategories] = await Promise.all([
  //       this.categoryRepository.find({
  //         where: { id: In(allCategoryIds) },
  //         select: ['id', 'name'],
  //       }),
  //       this.categoryRepository.find({
  //         where: { id: In(allSubCategoryIds) },
  //         select: ['id', 'name'],
  //       }),
  //     ]);

  //     // 6️⃣ Map category and subcategory IDs to names
  //     const categoryMap = Object.fromEntries(
  //       categories.map((c) => [c.id, c.name]),
  //     );
  //     const subCategoryMap = Object.fromEntries(
  //       subcategories.map((s) => [s.id, s.name]),
  //     );

  //     // 7️⃣ Group mappings by eventId
  //     const eventCategoryMap = eventCategoryMappings.reduce(
  //       (acc, mapping: any) => {
  //         const eventId = Number(mapping.event.id); // 👈 ensure event.id is always number
  //         if (!acc[eventId]) acc[eventId] = [];
  //         acc[eventId].push({
  //           categoryId: mapping.categoryId,
  //           categoryName: categoryMap[mapping.categoryId] || null,
  //           subCategoryId: mapping.subCategoryId,
  //           subCategoryName: subCategoryMap[mapping.subCategoryId] || null,
  //         });
  //         return acc;
  //       },
  //       {} as Record<number, any[]>,
  //     );
  //     console.log('Enriched Series:', eventCategoryMap);
  //     // 8️⃣ Attach categories to events
  //     const enrichedSeries = seriesList.map((series) => ({
  //       ...series,
  //       events: series.events.map((event: any) => ({
  //         ...event,
  //         categories: eventCategoryMap[Number(event.id)] || [], // ✅ number comparison
  //       })),
  //     }));

  //     // 9️⃣ Return final response
  //     return {
  //       message: 'series returned Successfully',
  //       data: enrichedSeries,
  //       status: true,
  //     };
  //   } catch (error) {
  //     console.error('Error in getAllSeriesOfVenue:', error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  async getAllSeriesOfVenue(venueId: number) {
    try {
      // 1️⃣ Fetch all series with their events
      const seriesList = await this.seriesRepository.find({
        where: { venueId },
        relations: ['events'],
        order: {
          id: 'DESC',
          events: {
            eventStartDateTime: 'DESC',
          },
        },
      });

      if (!seriesList.length) {
        return {
          message: 'series returned successfully',
          data: [],
          status: true,
        };
      }

      // 2️⃣ Collect all event IDs
      const allEventIds = seriesList.flatMap((series) =>
        (series.events || []).map((event: any) => event.id),
      );

      // 3️⃣ Fetch event-category mappings (plain columns only)
      const eventCategoryMappings = allEventIds.length
        ? await this.eventCategoriesRepository.find({
            where: { event: { id: In(allEventIds) } },
            relations: ['event'],
            select: ['categoryId', 'subCategoryId'],
          })
        : [];

      // 4️⃣ Collect all unique category and subcategory IDs
      const allCategoryIds = [
        ...new Set(eventCategoryMappings.map((m) => m.categoryId)),
      ];
      const allSubCategoryIds = [
        ...new Set(eventCategoryMappings.map((m) => m.subCategoryId)),
      ];

      // 5️⃣ Fetch names from `categories` and `specific_categories` tables
      const [categories, subcategories] = await Promise.all([
        this.categoryRepository.find({
          where: { id: In(allCategoryIds) },
          select: ['id', 'name'],
        }),
        this.categoryRepository.find({
          where: { id: In(allSubCategoryIds) },
          select: ['id', 'name'],
        }),
      ]);

      // 6️⃣ Map category and subcategory IDs to names
      const categoryMap = Object.fromEntries(
        categories.map((c) => [c.id, c.name]),
      );
      const subCategoryMap = Object.fromEntries(
        subcategories.map((s) => [s.id, s.name]),
      );

      // 7️⃣ Group mappings by eventId (normalize to string + prevent duplicates)
      const eventCategoryMap = eventCategoryMappings.reduce(
        (acc, mapping: any) => {
          const eventId = String(mapping.event.id); // ✅ ensure string key

          if (!acc[eventId]) acc[eventId] = [];

          // Avoid duplicate category-subcategory pairs
          const key = `${mapping.categoryId}-${mapping.subCategoryId}`;
          const alreadyExists = acc[eventId].some(
            (m) => `${m.categoryId}-${m.subCategoryId}` === key,
          );
          if (!alreadyExists) {
            acc[eventId].push({
              categoryId: mapping.categoryId,
              categoryName: categoryMap[mapping.categoryId] || null,
              subCategoryId: mapping.subCategoryId,
              subCategoryName: subCategoryMap[mapping.subCategoryId] || null,
            });
          }

          return acc;
        },
        {} as Record<string, any[]>, // ✅ keys are strings
      );

      // 8️⃣ Attach categories to events (convert event.id → string)
      const enrichedSeries = seriesList.map((series) => ({
        ...series,
        events: series.events.map((event: any) => ({
          ...event,
          categories: eventCategoryMap[String(event.id)] || [], // ✅ now matches
        })),
      }));

      // 9️⃣ Return final response
      return {
        message: 'series returned Successfully',
        data: enrichedSeries,
        status: true,
      };
    } catch (error) {
      console.error('Error in getAllSeriesOfVenue:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getSeriesById(id: number, venueId: number) {
    let response: any;
    try {
      // --- Step 1: Get Series (either user or admin side)
      const series = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoinAndSelect(
          'series.events',
          'event',
          'event.venueId = :venueId',
          {
            venueId,
          },
        )
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
          throw new BadRequestException('Series not found');

        response = adminSeries;
      }

      // --- Step 2: Add Venue Timezone
      const venueTimeZone = await this.venueRepository.findOne({
        where: { id: venueId },
        select: ['timezone'],
      });
      response['venueTimeZone'] = venueTimeZone?.timezone || null;

      // --- Step 3: Collect all event IDs
      const eventIds = (response?.events || []).map((e) => e.id);
      if (eventIds.length === 0) {
        return {
          message: 'Series returned successfully (no events found)',
          data: response,
          status: true,
        };
      }

      // --- Step 4: Fetch categories for all events (distinct + subcategories)
      const eventCategories = await this.eventCategoriesRepository.query(
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

      // --- Step 5: Map categories to each event
      const catMap = new Map<number, any[]>();
      for (const row of eventCategories) {
        try {
          catMap.set(Number(row.eventId), JSON.parse(row.categories || '[]'));
        } catch {
          catMap.set(Number(row.eventId), []);
        }
      }

      response.events = response.events.map((event) => ({
        ...event,
        categories: catMap.get(event.id) || [],
      }));

      // --- Step 6: Return formatted response
      return {
        message: 'Series returned successfully',
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
        sub_venue_id: neighbourhoodId,
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
