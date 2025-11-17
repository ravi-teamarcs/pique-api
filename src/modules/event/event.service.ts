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
import {
  formatInTimeZone,
  format as formatTz,
  utcToZonedTime,
  zonedTimeToUtc,
} from 'date-fns-tz';
import { EmailService } from '../Email/email.service';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';
import { formatUtcToTimezoneParts } from 'src/common/utils/common.utils';
import { EventCategorySubcategory } from './entities/event-category-subcategory.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,
    private readonly emailService: EmailService,
    private readonly bookingService: BookingService,
    private readonly notificationService: NotificationService,
  ) {}

  async createEvent(dto: CreateEventDto) {
    try {
      const {
        title,
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
      if (categories.length === 0) {
        throw new BadRequestException(
          'At least one category-subcategory pair is required',
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
          console.log(
            'Creating EventCategorySubcategory record for:',
            subCatId,
          );
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
      throw new InternalServerErrorException(error.message);
    }
  }

  async handleUpdateEvent(dto: any, venueId: number) {
    const {
      title,
      description,
      eventId,
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

      // Convert venue local time to UTC
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
        formatInTimeZone(startTime, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") !==
          formatInTimeZone(
            new Date(event.eventStartDateTime),
            'UTC',
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
          );

      const hasEndDateTimeChanged =
        endTime &&
        formatInTimeZone(endTime, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") !==
          formatInTimeZone(
            new Date(event.eventEndDateTime),
            'UTC',
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
          );

      if (hasStartDateTimeChanged || hasEndDateTimeChanged) {
        updatePayload['status'] = 'rescheduled';
      }

      // Update the event
      Object.assign(event, updatePayload);
      await this.eventRepository.save(event);

      // Update categories
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

      // Notify entertainers if rescheduled
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

  async getAllEvents(id: number, page: number = 1, pageSize: number = 10) {
    try {
      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const events = await this.eventRepository
        .createQueryBuilder('event_table') // 👈 use this alias here
        .leftJoin('neighbourhood', 'hood', 'hood.id = event_table.sub_venue_id')
        .leftJoin('venue', 'venue', 'venue.id = event_table.venueId')
        .leftJoin('event_table.series', 'series')
        .where('event_table.venueId = :id', { id })
        .andWhere('event_table.series_id IS NULL')
        .select([
          'event_table.id AS id',
          'event_table.title AS title',
          'event_table.venueId AS venueId',
          'event_table.description AS description',
          'event_table.eventStartDateTime AS eventStartDateTime',
          'event_table.eventEndDateTime AS eventEndDateTime',
          'event_table.recurring AS recurring',
          'venue.timezone AS venueTimeZone',
          'event_table.status AS status',
          'event_table.slug AS slug',
          'event_table.createdAt AS createdAt',
          'hood.id AS neighbourhoodId',
          'hood.name AS neighbourhoodName',
          'series.id AS seriesId',
          'series.seriesName AS seriesName',
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
          WHERE ecs2.event_id = event_table.id
            AND ecs2.category_id = c.id
        )
      )
    )
    FROM (
      SELECT DISTINCT ecs.category_id, ecs.event_id
      FROM event_category_subcategory ecs
    ) uniq
    JOIN categories c ON c.id = uniq.category_id
    WHERE uniq.event_id = event_table.id
  ) AS categories
`,
        )

        .orderBy('event_table.createdAt', 'DESC')
        .limit(take)
        .offset(skip)
        .getRawMany();
      // ← this returns raw data with aliases
      const totalCount = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.venueId = :id', { id })
        .getCount();

      const parsedEvents = events.map((event) => ({
        ...event,
        categories: event.categories ? JSON.parse(event.categories) : [],
      }));
      return {
        message: 'Events fetched successfully',
        count: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        data: parsedEvents,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // Api Working
  // async getEventListDropdown(id: number) {
  //   try {
  //     const today = startOfDay(new Date());

  //     const [events, totalCount] = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .where('event.venueId = :id', { id })
  //       .andWhere('event.eventStartDateTime >= :today', { today })
  //       .andWhere('event.status IN (:...status)', {
  //         status: ['confirmed', 'rescheduled', 'invited', 'unpublished'],
  //       })
  //       .orderBy('event.createdAt', 'DESC')
  //       .select([
  //         'event.id',
  //         'event.title',
  //         'event.venueId',
  //         'event.description',
  //         'event.eventStartDateTime',
  //         'event.eventEndDateTime',
  //         'event.status',
  //         'event.slug',
  //         'event.categoryId',
  //         'event.subCategoryId',
  //       ])
  //       .getManyAndCount();

  //     return {
  //       message: 'Events dropdown list fetched successfully',
  //       count: totalCount,
  //       data: events,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message); // fixed typo
  //   }
  // }
  async getEventListDropdown(id: number, entertainerCategories: any[]) {
    try {
      const today = startOfDay(new Date());

      // 🧩 Build a flattened list of all valid category-subcategory pairs
      const categorySubcategoryPairs = entertainerCategories.flatMap((cat) =>
        cat.specific_category.map((sub) => ({
          categoryId: Number(cat.id),
          categoryName: cat.categoryName,
          subCategoryId: Number(sub.id),
          subCategoryName: sub.specificCategoryName,
        })),
      );

      if (!categorySubcategoryPairs.length) {
        return {
          message: 'No entertainer categories provided',
          count: 0,
          data: [],
          status: true,
        };
      }

      const validPairs = new Set(
        categorySubcategoryPairs.map(
          (p) => `${p.categoryId}-${p.subCategoryId}`,
        ),
      );

      // 🎯 Step 1: Fetch events for this venue
      const baseEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.venueId = :id', { id })
        .andWhere('event.eventStartDateTime >= :today', { today })
        .andWhere('event.status IN (:...status)', {
          status: ['confirmed', 'rescheduled', 'invited', 'unpublished'],
        })
        .andWhere('event.series_id IS NULL')
        .select([
          'event.id AS id',
          'event.title AS title',
          'event.venueId AS venueId',
          'event.description AS description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.status AS status',
          'event.slug AS slug',
        ])
        .orderBy('event.createdAt', 'DESC')
        .getRawMany();

      if (!baseEvents.length) {
        return {
          message: 'No events found for this venue',
          count: 0,
          data: [],
          status: true,
        };
      }

      const eventIds = baseEvents.map((e) => e.id);

      // 🎯 Step 2: Get each event’s categories/subcategories
      const eventCategoryLinks = await this.eventCategoriesRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'category', 'category.id = ecs.category_id')
        .leftJoin(
          'categories',
          'subcategory',
          'subcategory.id = ecs.subcategory_id',
        )
        .select([
          'ecs.id AS id',
          'ecs.event_id AS eventId',
          'ecs.category_id AS categoryId',
          'ecs.subcategory_id AS subCategoryId',
          'category.name AS categoryName',
          'subcategory.name AS subCategoryName',
        ])
        .where('ecs.event_id IN (:...eventIds)', { eventIds })
        .getRawMany();

      if (!eventCategoryLinks.length) {
        return {
          message: 'No category-subcategory data found for events',
          count: 0,
          data: [],
          status: true,
        };
      }

      // 🧠 Step 3: Match only valid pairs from entertainer’s list
      const matchedEventIds = new Set(
        eventCategoryLinks
          .filter((link) =>
            validPairs.has(`${link.categoryId}-${link.subCategoryId}`),
          )
          .map((link) => link.eventId),
      );

      // 🧩 Step 4: Build event data with grouped category info
      const filteredEvents = baseEvents
        .filter((e) => matchedEventIds.has(e.id))
        .map((event) => {
          const linksForEvent = eventCategoryLinks.filter(
            (l) => l.eventId === event.id,
          );

          // Group by categoryId → add subcategories inside
          const groupedCategories = Object.values(
            linksForEvent.reduce((acc, l) => {
              if (!acc[l.categoryId]) {
                acc[l.categoryId] = {
                  categoryId: l.categoryId,
                  categoryName: l.categoryName,
                  subCategories: [],
                };
              }
              // add unique subcategories
              if (
                !acc[l.categoryId].subCategories.some(
                  (sc) => sc.id === l.subCategoryId,
                )
              ) {
                acc[l.categoryId].subCategories.push({
                  id: l.subCategoryId,
                  name: l.subCategoryName,
                });
              }
              return acc;
            }, {}),
          );

          return {
            ...event,
            categories: groupedCategories,
          };
        });

      return {
        message:
          filteredEvents.length > 0
            ? 'Events matched successfully'
            : 'No events match entertainer categories',
        count: filteredEvents.length,
        data: filteredEvents,
        status: true,
      };
    } catch (error) {
      console.error('getEventListDropdown error:', error);
      throw new InternalServerErrorException(error.message);
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
      const bookings = await this.bookingRepository.find({
        where: { eventId },
      });

      for (const book of bookings) {
        await this.bookingRepository.remove(book);
      }

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

    // console.log(
    //   'Venue Local Time formatted:',
    //   formatTz(venueLocalTime, 'yyyy-MM-dd HH:mm zzz', {
    //     timeZone: venueTimeZone,
    //   }),
    // );
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
    try {
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
        .leftJoinAndSelect('event.series', 'series')
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
          'event.slug AS slug',
          'event.status AS status',
          'venue.name AS venueName',
          'hood.name AS neighbourhoodName',
        ])
        .addSelect(
          `
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'categoryId', cat.id,
          'categoryName', cat.name,
          'subCategories',
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'subCategoryId', subcat.id,
                  'subCategoryName', subcat.name
                )
              )
              FROM event_category_subcategory ecs2
              JOIN categories subcat ON subcat.id = ecs2.subcategory_id
              WHERE ecs2.event_id = :eventId
                AND ecs2.category_id = cat.id
            )
        )
      )
      FROM (
        SELECT DISTINCT ecs.category_id
        FROM event_category_subcategory ecs
        WHERE ecs.event_id = :eventId
      ) uniq
      JOIN categories cat ON cat.id = uniq.category_id
    ) AS categories
  `,
        )
        .setParameters({ eventId: id }) // ✅ proper parameter binding
        .getRawOne();

      if (!event) {
        throw new BadRequestException('Event not found');
      }

      const parsedResult = {
        ...event,
        categories: event.categories ? JSON.parse(event.categories) : [],
      };

      return {
        message: 'Event returned successfully',
        status: true,
        data: parsedResult,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
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
          'booking.id AS bookingId',
          'user.email AS email',
          'user.id AS userId',
          'entertainer.name AS entertainerName',
          'entertainer.email AS entertainerEmail',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS  eventEndDateTime',
          'venue.name AS venueName',
          'venue.timezone AS venueTimeZone',
        ])
        .where('booking.status NOT IN (:...statuses)', {
          statuses: ['removed', 'declined', 'completed'],
        })
        .andWhere('booking.eventId = :eventId', { eventId })
        .getRawMany();

      for (const book of bookings) {
        await this.bookingRepository.update(
          { id: book.bookingId },
          { status: 'closed' },
        );

        if (book.entertainerEmail || book.email) {
          const { Date: eventDate, Time: startTime } = formatUtcToTimezoneParts(
            book.eventStartDateTime,
            book.venueTimeZone,
          );
          const { Time: endTime } = formatUtcToTimezoneParts(
            book.eventEndDateTime,
            book.venueTimeZone,
          );
          const emailPayload = {
            to: book.entertainerEmail || book.email,
            subject: `Event ${status}`,
            templateName: 'cancelled-event-template.html',
            replacements: {
              eventName: book.slug,
              eventDate,
              eventTime: `${startTime} to ${endTime}`,
              year: new Date().getFullYear(),
            },
          };
          this.emailService.handleSendEmail(emailPayload);

          if (book.userId) {
            const notificationPayload = {
              title: 'Event Canceled',
              body: `Venue ${book.venueName} has canceled the event ${book.slug} scheduled on date : ${eventDate} and Time : ${startTime} to ${endTime}`,
              type: 'event_canceled',
            };
            this.notificationService.sendPush(notificationPayload, book.userId);
          }
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
