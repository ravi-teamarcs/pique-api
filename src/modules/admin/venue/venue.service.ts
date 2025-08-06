import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Venue } from './entities/venue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Repository } from 'typeorm';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto, CreateVenueRequestDto } from './Dto/create-venue.dto';
import { User } from '../users/entities/users.entity';
import { AddLocationDto } from './Dto/add-location.dto';
import { UpdateLocationDto } from './Dto/update-location.dto';
import { Neighbourhood } from './entities/neighbourhood.entity';
import { CreateNeighbourhoodDto } from './Dto/create-neighbourhood.dto';
import { UpdateNeighbourhoodDto } from './Dto/update-neighbourhood';
import { MediaService } from '../media/media.service';
import { UploadedFile } from 'src/common/types/media.type';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AdminCreatedUser } from '../users/entities/admin.created.entity';
import { UpdateVenueUserStatus } from './Dto/update-venue-user-status.dto';
import { NotificationService } from 'src/modules/notification/notification.service';
import { EmailService } from 'src/modules/Email/email.service';
import { Booking } from '../booking/entities/booking.entity';
import { sub } from 'date-fns';
import { BookingLog } from '../booking/entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Event } from '../events/entities/event.entity';
import { format } from 'date-fns-tz';
import { States } from '../location/entities/state.entity';
import { Cities } from '../location/entities/city.entity';
import { GeocodingService } from 'src/modules/location/geocoding.service';
import { InvoiceEvent } from '../invoice/entities/invoices-event.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { getTimezoneByLatLng } from 'src/common/utils/slots-utils';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
    @InjectRepository(Neighbourhood)
    private readonly neighbourRepository: Repository<Neighbourhood>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AdminCreatedUser)
    private readonly tempRepository: Repository<AdminCreatedUser>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(InvoiceEvent)
    private readonly invoiceEventRepository: Repository<InvoiceEvent>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,

    @InjectRepository(BookingLog)
    private readonly logRepository: Repository<BookingLog>,

    @InjectRepository(States)
    private readonly stateRepository: Repository<States>,

    @InjectRepository(Cities)
    private readonly cityRepository: Repository<Cities>,

    private readonly dataSource: DataSource,

    private readonly mediaService: MediaService,
    private readonly notifyService: NotificationService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly geoService: GeocodingService,
  ) {}

  async getAllVenue({
    page,
    pageSize,
    search,
  }: {
    page: number;
    pageSize: number;
    search: string;
  }) {
    const skip = (page - 1) * pageSize;

    const baseQuery = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.user', 'user')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS media_user_id',
              `JSON_ARRAYAGG(
            JSON_OBJECT(
              "url", CONCAT(:serverUri, media.url),
              "type", media.type,
              "id", media.id
            )
          ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media',
        'media.media_user_id = venue.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'neighbourhood.venueId AS nh_venue_id',
              `JSON_ARRAYAGG(
            JSON_OBJECT(
              "id", neighbourhood.id,
              "name", neighbourhood.name,
              "contactPerson", neighbourhood.contact_person,
              "contactNumber", neighbourhood.contact_number
            )
          ) AS neighbourhoodDetails`,
            ])
            .from('neighbourhood', 'neighbourhood')
            .groupBy('neighbourhood.venueId'),
        'neighbourhoods',
        'neighbourhoods.nh_venue_id = venue.id',
      )
      .where('venue.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .setParameter('serverUri', this.config.get<string>('BASE_URL'));

    // Add search condition
    if (search) {
      baseQuery.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    // Get total count first
    const totalCount = await baseQuery.getCount();

    // Get paginated records using limit and offset
    const venues = await baseQuery
      .select([
        'venue.id AS id',
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.description AS description',
        'venue.city AS city_code',
        'venue.state AS state_code',
        'venue.country AS country_code',
        'venue.isPiqueVerified AS isPiqueVerified',
        'venue.contact_person As contactPerson',
        'venue.contact_person As contactNumber',
        'venue.zipCode AS zipCode',
        'venue.venueType AS venueType',
        'venue.timezone AS timezone',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'venue.status AS status',
        'COALESCE(media.mediaDetails, "[]") AS media',
        'COALESCE(neighbourhoods.neighbourhoodDetails, "[]") AS neighbourhoods',
      ])
      .orderBy('venue.id', 'DESC')
      .limit(pageSize)
      .offset(skip)
      .getRawMany();

    const parsedVenues = venues.map((v) => ({
      ...v,
      media: JSON.parse(v.media),
      isPiqueVerified: v.isPiqueVerified === 1 ? true : false,
      neighbourhoods: JSON.parse(v.neighbourhoods),
      venueType: typeof v.venueType === 'string' ? v.venueType.split(',') : [],
    }));

    return {
      message: 'Venue Details fetched Successfully',
      records: parsedVenues,
      total: totalCount,
      page,
      pageSize,
      pageCount: Math.ceil(totalCount / pageSize),
    };
  }

  async getAllVenuesDropdown() {
    const venues = await this.venueRepository.find();
    return {
      message: 'venues returned Successfully',
      records: venues,
      status: true,
    };
  }

  async getVenueByUserId(venueId: number) {
    const venueDetails = await this.venueRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.user', 'user')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin(
        (qb) =>
          qb
            .select([
              'media.user_id AS media_user_id', // expose user_id
              `JSON_ARRAYAGG(
                JSON_OBJECT(
                  "url", CONCAT(:serverUri, media.url),
                  "type", media.type
                )
              ) AS mediaDetails`,
            ])
            .from('media', 'media')
            .groupBy('media.user_id'),
        'media', // alias for the subquery
        'media.media_user_id = venue.id', // now using the alias correctly
      )
      .select([
        'venue.id AS id',
        'venue.name AS name',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.description AS description',
        'venue.city AS city_code',
        'venue.state AS state_code',
        'venue.country AS country_code',
        'venue.zipCode AS zipCode',
        'venue.contactPerson AS venueContactPerson',
        'venue.contactNumber AS venueContactNumber',
        'venue.zipCode AS zipCode',
        'venue.isPiqueVerified AS isPiqueVerified',
        'venue.venueType AS venueType',
        'venue.timezone AS timezone',
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'user.id AS user_id',
        'user.createdByAdmin AS createdByAdmin',
        'COALESCE(media.mediaDetails, "[]") AS media',
      ])

      .where('venue.id=:venueId', { venueId })
      .setParameter('serverUri', this.config.get<string>('BASE_URL'))
      .getRawOne();

    const neighbourhood = await this.neighbourRepository.find({
      where: { venueId },
    });
    const password = null;
    if (venueDetails.createdByAdmin === 1) {
      const data = await this.tempRepository.findOne({
        where: { email: venueDetails.email },
      });
      venueDetails['password'] = data?.password;
    }

    const { media, createdByAdmin, isPiqueVerified, venueType, ...rest } =
      venueDetails;
    const response = {
      ...rest,
      createdByAdmin: createdByAdmin === 0 ? false : true,
      media: JSON.parse(media),
      isPiqueVerified: isPiqueVerified === 1 ? true : false,
      neighbourhoods: neighbourhood,
      venueType: typeof venueType === 'string' ? venueType.split(',') : [],
    };

    return {
      message: 'Venue Details fetched Successfully',
      data: response,
      status: true,
    };
  }

  async createVenue(dto: CreateVenueRequestDto, uploadedFiles: UploadedFile[]) {
    const { createLogin, user, venue, neighbourhood } = dto;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let savedUser = null;

      // 1. Create user if checkbox is checked
      if (createLogin) {
        const { password, ...rest } = user;
        const alreadyExists = await this.userRepository.findOne({
          where: { email: rest.email },
        });
        if (alreadyExists)
          throw new BadRequestException({ message: 'Email Already in Use' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.userRepository.create({
          ...rest,
          password: hashedPassword,
          isVerified: true,
          status: 'active',
          createdByAdmin: true,
        });
        savedUser = await queryRunner.manager.save(newUser);
        // saving password in temp repo
        const temp = this.tempRepository.create({
          email: savedUser.email,
          password,
        });
        await this.tempRepository.save(temp);
      }

      const city = await this.cityRepository.findOne({
        where: { id: venue.city },
        select: ['name'],
      });
      const state = await this.stateRepository.findOne({
        where: { id: venue.state },
        select: ['name'],
      });

      const fullAddress = `${venue.addressLine1 ?? ''}, ${venue.addressLine2 ?? ''}, ${city?.name ?? ''}, ${state?.name ?? ''} ${venue.zipCode}`;

      // To get latitude and Longitude
      const { lat, lng } = await this.geoService.geocodeAddress(fullAddress);
      let timezone = getTimezoneByLatLng(lat, lng);

      let newVenuePayload = {
        ...venue,
        latitude: lat,
        longitude: lng,
        timezone,
      };

      // 2. Create venue with reference to user (if present)
      const newVenue = this.venueRepository.create({
        ...newVenuePayload,
        user: savedUser ? { id: savedUser.id } : null,
        status: 'active',
        profileStep: 3,
        isProfileComplete: true,
      });
      const savedVenue = await queryRunner.manager.save(newVenue);

      // 3. Upload media (pass queryRunner to use same transaction if saving to DB)
      if (neighbourhood && neighbourhood.length > 0) {
        const neighbourhoods = neighbourhood.map((item) =>
          this.neighbourRepository.create({
            ...item,
            venueId: savedVenue.id, // ensure this is included
          }),
        );
        await queryRunner.manager.save(neighbourhoods);
      }

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleMediaUpload(savedVenue.id, uploadedFiles);
      }
      await queryRunner.commitTransaction();

      return {
        message: 'Venue Created Successfully with media .',
        status: true,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: error.mesage,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async updateVenue(
    dto: UpdateVenueDto,
    venueId: number,
    uploadedFiles: UploadedFile[] = [],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let { user, createLogin, venue } = dto;

    if (typeof user === 'string') {
      user = JSON.parse(user);
    }
    try {
      const venue = await queryRunner.manager.findOne(Venue, {
        where: { id: venueId },
        relations: ['user'],
      });
      if (!venue) {
        throw new NotFoundException({
          message: 'Venue Not Found',
          status: false,
        });
      }

      const userId = venue?.user ? venue.user.id : null;
      const alreadyHaveLoginCredentials = venue?.user ? true : false;

      if (createLogin) {
        if (alreadyHaveLoginCredentials) {
          // If already have login credentials then update them.

          if (user.email !== venue.user.email) {
            // const userData = JSON.parse(user);
            const alreadyExists = await this.userRepository.findOne({
              where: { email: user?.email },
            });
            if (alreadyExists)
              throw new BadRequestException({
                message:
                  'Email already taken by another user , cannot update email. ',
              });
          }

          const hashedPassword = await bcrypt.hash(user.password, 10);
          await this.userRepository.update(
            { id: userId },
            { email: user.email, password: hashedPassword },
          );
          await this.tempRepository.update(
            { email: venue.user.email },
            { email: user.email, password: user.password },
          );
        } else {
          const alreadyExists = await this.userRepository.findOne({
            where: { email: user.email },
          });
          if (alreadyExists)
            throw new BadRequestException({ message: 'Email Already in Use' });

          const hashedPassword = await bcrypt.hash(user.password, 10);
          const newUser = this.userRepository.create({
            email: user.email,
            password: hashedPassword,
            isVerified: true,
            createdByAdmin: true,
            role: 'venue',
          });
          const savedUser = await this.userRepository.save(newUser);
          // Also add update on this.

          await this.venueRepository.update(
            { id: venue.id },
            { user: { id: savedUser.id } },
          );
        }
      }

      if (typeof dto.venue === 'string') {
        dto.venue = JSON.parse(dto.venue);
      }

      //

      const city = await this.cityRepository.findOne({
        where: { id: dto.venue.city },
        select: ['name'],
      });
      const state = await this.stateRepository.findOne({
        where: { id: dto.venue.state },
        select: ['name'],
      });

      const fullAddress = `${dto.venue.addressLine1 ?? ''}, ${dto.venue.addressLine2 ?? ''}, ${city?.name ?? ''}, ${state?.name ?? ''} ${dto.venue.zipCode}`;

      // To get latitude and Longitude
      const { lat, lng } = await this.geoService.geocodeAddress(fullAddress);
      let timezone = getTimezoneByLatLng(lat, lng);

      //  Update Payload
      const updatedVenue = {
        ...dto.venue,
        latitude: lat,
        longitude: lng,
        timezone,
      };
      await queryRunner.manager.update(Venue, { id: venue.id }, updatedVenue);

      if (uploadedFiles?.length > 0) {
        const res = await this.mediaService.handleMediaUpload(
          venue.id,
          uploadedFiles,
        );
      }
      await queryRunner.commitTransaction();
      return { message: 'Venue updated with media Sucessfully ', status: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async deleteVenue(id: number): Promise<any> {
    const venue = await this.venueRepository.findOne({ where: { id } });

    if (!venue) {
      throw new NotFoundException({
        message: `Venue with ID ${id} not found`,
        status: false,
      });
    }

    await this.venueRepository.remove(venue); // Removes the venue from the repository

    return { message: 'Venue deleted successfully', status: true };
  }

  async searchEntertainers(query: string) {
    return await this.venueRepository.find({
      where: { isParent: true },
    });
  }

  // Creation Logic Neighbourhood
  async create(dto: CreateNeighbourhoodDto) {
    const neighbourhood = this.neighbourRepository.create(dto);
    await this.neighbourRepository.save(neighbourhood);
    return { message: 'Neighbourhood added successfully', status: true };
  }

  async update(id: number, dto: UpdateNeighbourhoodDto) {
    await this.neighbourRepository.update(id, dto);
    return { message: 'Neighbourhood updated successfully', status: true };
  }

  async getVenueNeighbourhoods(id: number) {
    const res = await this.neighbourRepository.find({
      where: { venueId: id },
    });
    return {
      message: 'Neighbourhood fetched successfully',
      data: res,
      status: true,
    };
  }

  async removeNeighbourhood(id: number) {
    const result = await this.neighbourRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Neighbourhood not found');
    }
    return { message: 'Neighbourhood deleted successfully', status: true };
  }

  // Update user status Logic

  async approveVenue(dto: UpdateVenueUserStatus) {
    const { id, status } = dto;
    try {
      const venue = await this.venueRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!venue) throw new NotFoundException('Venue not found');

      await this.venueRepository.update({ id }, { status });
      // Also update the user status if exists
      if (venue.user) {
        await this.userRepository.update({ id: venue.user.id }, { status });
      }
      const currentYear = new Date().getFullYear();

      const statusToMessageMap = {
        active: 'activated',
        rejected: 'rejected',
        inactive: 'deactivated',
      };

      if (venue.user) {
        const statusToPayloadMap = {
          active: {
            to: venue.user.email,
            subject: 'Account Status',
            templateName: 'account-approved.html',
            replacements: { name: venue.user.name, year: currentYear },
          },
          inactive: {
            to: venue.user.email,
            subject: 'Account Status',
            templateName: 'account-deactivation.html',
            replacements: {
              User: venue.user.name,
              Date: new Date().getFullYear(),
              Year: currentYear,
            },
          },
          rejected: {
            to: venue.user.email,
            subject: 'Account Status',
            templateName: 'account-rejected.html',
            replacements: { name: venue.user.name, year: currentYear },
          },
        };

        const emailPayload = statusToPayloadMap[status];
        this.emailService.handleSendEmail(emailPayload);
      }
      return {
        message: `Venue profile has been ${statusToMessageMap[status]} successfully`,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateBookingStatus(dto) {
    const updatedBookings = [];
    const { bookingIds, status, eventId } = dto;

    try {
      // Check if Invoice is already generated for the event then set it to isOutDated.
      const invoiceMetaData = await this.invoiceEventRepository.findOne({
        where: { eventId },
      });

      if (invoiceMetaData)
        await this.invoiceRepository.update(
          { id: invoiceMetaData.invoiceId },
          { isOutdated: true },
        );

      for (const bookingId of bookingIds) {
        const booking = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
          .leftJoin('users', 'vuser', 'vuser.id = venue.userId') // venue's user
          .leftJoin(
            'entertainers',
            'entertainer',
            'entertainer.id = booking.entId',
          )
          .leftJoin('users', 'euser', 'euser.id = entertainer.userId') // entertainer's user

          // Join venue table
          .select([
            'booking.id AS id',
            'booking.status AS status',
            'booking.venueId AS vid',
            'booking.showStartDateTime AS showStartDateTime',
            'euser.email AS eEmail',
            'entertainer.email AS email',
            'euser.name AS ename',
            'euser.id AS eid ',
            'euser.phoneNumber AS ephone',

            'venue.name  As  vname',
            'vuser.email As vemail',
            'vuser.phoneNumber As vphone',
            'vuser.id As vid',
          ])
          .where('booking.id = :id', { id: bookingId })
          .getRawOne();

        if (!booking) {
          return { message: 'Booking not found', status: false };
        }

        await this.bookingRepository.update({ id: bookingId }, { status });

        const logPayload = this.logRepository.create({
          bookingId,
          performedBy: 'admin',
          status,
          user: null,
          date: new Date(),
        });

        await this.logRepository.save(logPayload);

        if (booking.email || booking.eEmail) {
          const formattedDate = format(
            booking.showStartDateTime,
            'dd MMM yyyy',
            {
              timeZone: 'UTC',
            },
          );

          const emailPayload = {
            to: booking.email || booking.eEmail,
            subject: `Booking Request ${status}`,
            templateName:
              status === 'confirmed' ? 'confirmed-booking.html' : '',
            replacements: {
              venueName: booking.vname,
              entertainerName: booking.ename,
              id: booking.id,
              bookingTime: format(booking.showStartDateTime, 'HH:mm', {
                timeZone: 'UTC',
              }),
              bookingDate: formattedDate,
            },
          };

          this.emailService.handleSendEmail(emailPayload);

          this.notifyService.sendPush(
            {
              title: 'Booking Response',
              body: `${booking?.vname ?? 'venue'} has ${status} the booking request.`,
              type: 'booking_response',
            },

            booking.eid,
          );
        }
        updatedBookings.push(bookingId);
      }

      // Here update the status of event (to 'confirmed' )
      await this.eventRepository.update(
        { id: eventId },
        { status: 'confirmed' },
      );
      // Add Logic
      this.notSelectedforEvent(eventId, updatedBookings);
      return {
        message: 'Booking status updated successfully',
        data: updatedBookings,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  private async notSelectedforEvent(eventId: number, confirmedBookings) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
      .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
      .leftJoin('users', 'user', 'user.id = entertainer.userId')
      .select([
        'booking.id AS id',
        'entertainer.entertainer_name AS entertainerName',
        'entertainer.email AS email',
        'user.email AS userEmail',
        'venue.name AS venueName',
        'venue.timezone AS venueTimeZone',
        'event.slug AS eventName',
        'event.eventStartDateTime AS eventStartDateTime',
        'user.id AS entId',
      ])
      .where('booking.eventId=:eventId', { eventId })
      .getRawMany();

    if (bookings && bookings.length > 0) {
      const rejectedRequest = bookings.filter(
        (item) => !confirmedBookings.includes(item.id),
      );

      // Canceled the booking First then send them the Booking Request
      for (const req of rejectedRequest) {
        const res = await this.bookingRepository.update(
          { id: req.id, status: In(['invited', 'applied']) },
          { status: 'closed' },
        );

        // Add a closed log in log repository.
        const logPayload = this.logRepository.create({
          bookingId: req.id,
          performedBy: 'admin',
          status: 'closed',
          user: null,
        });
        await this.logRepository.save(logPayload);

        // Check any of email  exists then send Email.
        if (req.email || req.userEmail) {
          const emailPayload = {
            to: req.email,
            subject: `Status update of Booking Request`,
            templateName: 'cancellation.html',
            replacements: {
              entertainerName: req.entertainerName,
              eventName: req.eventName,
              eventDate: format(req.eventStartDateTime, 'dd MMM yyyy HH:mm z', {
                timeZone: req.venueTimeZone ?? 'UTC',
              }),
            },
          };

          await this.emailService.handleSendEmail(emailPayload);
          if (req.entId) {
            this.notifyService.sendPush(
              {
                title: 'Status update of booking invitation for event.',
                body: `${req.venueName} has closed the position for ${req.eventName}event.`,
                type: 'booking_response',
              },
              req.entId,
            );
          }
        }
      }
    }
  }

  async toggleVerificationFlag(venueId: number) {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }

    await this.venueRepository.update(
      { id: venueId },
      { isPiqueVerified: !venue.isPiqueVerified },
    );
    const savedVerification = await this.venueRepository.findOne({
      where: { id: venueId },
      select: ['isPiqueVerified'],
    });

    return {
      message: 'Venue profile verification toggled successfully.',
      status: true,
      data: savedVerification,
    };
  }
}
