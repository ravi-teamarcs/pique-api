import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Venue } from './entities/venue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
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
import { format, sub } from 'date-fns';
import { BookingLog } from '../booking/entities/booking-log.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';

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

    @InjectRepository(BookingLog)
    private readonly logRepository: Repository<BookingLog>,

    private readonly dataSource: DataSource,

    private readonly mediaService: MediaService,
    private readonly notifyService: NotificationService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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

    const res = this.venueRepository
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
        'city.name AS city',
        'state.name AS state',
        'country.name AS country',
        'user.email AS email',
        'venue.status AS status',
        'COALESCE(media.mediaDetails, "[]") AS media',
        'COALESCE(neighbourhoods.neighbourhoodDetails, "[]") AS neighbourhoods',
      ])
      .where('venue.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })

      .orderBy('venue.id', 'DESC')
      .setParameter('serverUri', this.config.get<string>('BASE_URL'));

    if (search) {
      res.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const totalCount = await res.getCount();

    // Paginate
    const venues = await res.skip(skip).take(pageSize).getRawMany();
    const parsedVenues = venues.map((v) => ({
      ...v,
      media: JSON.parse(v.media),
      neighbourhoods: JSON.parse(v.neighbourhoods),
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

    const { media, createdByAdmin, ...rest } = venueDetails;
    const response = {
      ...rest,
      createdByAdmin: createdByAdmin === 0 ? false : true,
      media: JSON.parse(media),
      neighbourhoods: neighbourhood,
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

      // 2. Create venue with reference to user (if present)
      const newVenue = this.venueRepository.create({
        ...venue,
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
                  'Email Already taken by another user , cannot update email. ',
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
          await this.venueRepository.update(
            { id: venue.id },
            { user: { id: savedUser.id } },
          );
        }
      }

      if (typeof dto.venue === 'string') {
        dto.venue = JSON.parse(dto.venue);
      }
      await queryRunner.manager.update(Venue, { id: venue.id }, dto.venue);

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

  async addVenueLocation(locDto: AddLocationDto) {
    const { venueId, ...rest } = locDto;
    const parentVenue = await this.venueRepository.findOne({
      where: { id: venueId, isParent: true },
      relations: ['user'],
    });

    if (!parentVenue) {
      throw new BadRequestException({
        message: 'Can not Add venue Location',
        status: false,
        error: 'Parent venue do not exists',
      });
    }

    const venueLoc = this.venueRepository.create({
      ...rest,
      name: parentVenue.name,
      user: { id: parentVenue.user.id },
      description: parentVenue.description,
      parentId: parentVenue.id,
      isParent: false,
    });

    await this.venueRepository.save(venueLoc);

    try {
      return { message: 'Location Added Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error Adding Location',
        status: false,
      });
    }
  }

  async updateLocation(id: number, dto: UpdateLocationDto) {
    const venueExists = await this.venueRepository.findOne({
      where: { id, isParent: false },
    });
    if (!venueExists) {
      throw new NotFoundException({
        message: 'Location not Found',
        status: false,
      });
    }

    try {
      await this.venueRepository.update({ id: venueExists.id }, dto);
      return {
        message: 'Location updatesd Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async removeLocation(id: number) {
    const venueExists = await this.venueRepository.findOne({
      where: { id, isParent: false },
    });
    if (!venueExists) {
      throw new NotFoundException({
        message: 'Location not Found',
        status: false,
      });
    }
    try {
      await this.venueRepository.remove(venueExists);
      return {
        message: 'Location removed Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
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

      if (!venue) throw new NotFoundException('Venue  not found');

      if (venue.user) {
        await this.userRepository.update({ id: venue.user.id }, { status });
      }

      await this.venueRepository.update({ id }, { status });

      const currentYear = new Date().getFullYear();
      // Send Email to the User
      const emailPayload = {
        to: venue.user.email,
        subject: 'Account Status',
        templateName:
          status === 'active'
            ? 'account-approved.html'
            : 'account-rejected.html',
        replacements: { name: venue.user.name, year: currentYear },
      };

      this.emailService.handleSendEmail(emailPayload);
      return { message: 'Venue Status updated Successfully', status: true };
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
    const { bookingIds, status } = dto;
    try {
      for (const bookingId of dto.bookingIds) {
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
            'booking.showTime AS showTime',
            'booking.showDate AS showDate',

            'euser.email AS eEmail',
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
          throw new NotFoundException({
            message: `Booking with ID ${bookingId} not found`,
          });
        }

        await this.bookingRepository.update({ id: bookingId }, { status });
        const logPayload = this.logRepository.create({
          bookingId,
          performedBy: 'admin',
          status,
          user: null,
        });

        await this.logRepository.save(logPayload);

        if (booking.eEmail) {
          const formattedDate = format(booking.showDate, 'yyyy-MM-dd'); // e.g. '2025-05-01'

          const emailPayload = {
            to: booking.eEmail,
            subject: `Booking Request ${status}`,
            templateName:
              status === 'confirmed' ? 'confirmed-booking.html' : '',
            replacements: {
              venueName: booking.vname,
              entertainerName: booking.ename,
              id: booking.id,
              bookingTime: booking.showTime,
              bookingDate: formattedDate,
            },
          };

          this.emailService.handleSendEmail(emailPayload);

          this.notifyService.sendPush(
            {
              title: 'Booking Response',
              body: `venue has ${status} the booking request.`,
              type: 'booking_response',
            },

            booking.eid,
          );
        }
        updatedBookings.push(bookingId);
      }

      // Add Logic

      return {
        message: 'Booking status updated successfully',
        data: updatedBookings,
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

  // private async notSelectedforEvent(eventId: number) {
  //   const confirmedBookings = [1, 2, 3, 4, 5];

  //   const bookings = await this.bookingRepository
  //     .createQueryBuilder('booking')
  //     .leftJoin('entertainers', 'entertainer', 'entertainer.id = booking.entId')
  //     .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
  //     .leftJoin('users', 'user', 'user.id = entertainer.userId')
  //     .select([
  //       'booking.id AS id',
  //       'entertainer.entertainer_name AS entertainerName',
  //       'user.email AS email',
  //     ])
  //     .getRawMany();

  //   if (bookings && bookings.length > 0) {
  //     const rejectedRequest = bookings.filter(
  //       (item) => !confirmedBookings.includes(item.id),
  //     );

  //     for (const req of rejectedRequest) {
  //       // if (entertainer.user) {
  //       //   const emailPayload = {
  //       //     to: entertainer.user.email,
  //       //     subject: `Status Update for Your Booking Request`,
  //       //     templateName: 'courtsey-message.html',
  //       //     replacements: {
  //       //       entertainerName: 'Dummy',
  //       //       eventName: '',
  //       //       eventDate: '',
  //       //     },
  //       //   };

  //         // await this.emailService.handleSendEmail(emailPayload);

  //         this.notifyService.sendPush(
  //           {
  //             title: 'Status Update for Your Booking Request',
  //             body: `venue has ${status} the booking request.`,
  //             type: 'booking_response',
  //           },
  //           req.entId,
  //         );
  //       }
  //     }
  //   }
}
