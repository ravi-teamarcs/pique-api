import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entertainer } from './entities/entertainer.entity';
import { Brackets, DataSource, In, Like, Not, Repository } from 'typeorm';
import { Categories } from './entities/Category.entity';
import { CreateCategoryDto } from './Dto/create-category.dto';
import { UpdateCategoryDto } from './Dto/update-category.dto';
import { CreateEntertainerDto } from './Dto/create-entertainer.dto';
import { UpdateStatusDto } from './Dto/update-status.dto';
import {
  UpdateAddressDto,
  UpdateEntertainerDto,
} from './Dto/update-entertainer.dto';
import slugify from 'slugify';
import { ConfigService } from '@nestjs/config';
import { ApproveEntertainer } from './Dto/approve-entertainer.dto';
import { User } from '../users/entities/users.entity';
import { UploadedFile } from 'src/common/types/media.type';
import * as bcrypt from 'bcryptjs';
import { MediaService } from '../media/media.service';
import { AdminCreatedUser } from '../users/entities/admin.created.entity';
import { EmailService } from 'src/modules/Email/email.service';
import { GetEntertainerDto } from './Dto/search-entertainer-query.dto';
import { EventsByMonthDto } from 'src/modules/entertainer/dto/get-events-bymonth.dto';
import { Booking } from '../booking/entities/booking.entity';
import { EntertainerAvailability } from './entities/entertainer-availability.entity';
import { EntertainerAvailabilityDto } from './Dto/entertainer-availability.dto';
import { UpdateAvailabilityDto } from './Dto/update-availability.dto';
import { Setting } from '../settings/entities/setting.entity';
import { instanceToPlain } from 'class-transformer';
import {
  getTimezoneByCity,
  getTimezoneByLatLng,
} from 'src/common/utils/slots-utils';
import { Cities } from '../location/entities/city.entity';
import { States } from '../location/entities/state.entity';
import { GeocodingService } from '../../location/geocoding.service';
import { EntertainerCategorySubcategory } from 'src/modules/entertainer/entities/entertainer-category-subcategory.entity';
import { EntertainerRateCard } from 'src/modules/entertainer/entities/entertainer-rate-card.entity';
import { EntertainerRateCardDto } from 'src/modules/entertainer/dto/rate-card.dto';
import { utcToZonedTime } from 'date-fns-tz';
import { convertUtcToTimezoneString } from 'src/common/utils/common.utils';
import { Event } from '../events/entities/event.entity';
import { EventCategorySubcategory } from '../events/entities/event-category-subcategory.entity';

@Injectable()
export class EntertainerService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Categories)
    private readonly CategoryRepository: Repository<Categories>,
    @InjectRepository(AdminCreatedUser)
    private readonly tempRepository: Repository<AdminCreatedUser>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(EntertainerAvailability)
    private readonly availabilityRepository: Repository<EntertainerAvailability>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(EntertainerCategorySubcategory)
    private readonly entCatRepository: Repository<EntertainerCategorySubcategory>,
    @InjectRepository(EventCategorySubcategory)
    private readonly eventCategoriesRepository: Repository<EventCategorySubcategory>,

    @InjectRepository(EntertainerRateCard)
    private readonly entRateRepository: Repository<EntertainerRateCard>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,

    @InjectRepository(Cities)
    private readonly cityRepository: Repository<Cities>,
    @InjectRepository(States)
    private readonly stateRepository: Repository<States>,

    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeocodingService,
  ) {}

  async getAllEntertainers(query: GetEntertainerDto) {
    const { page = 1, pageSize = 10, search = '', vaccinated, date } = query;
    const skip = (page - 1) * pageSize;

    // Build the base query with all conditions
    const baseQuery = this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .where('entertainer.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });

    if (search) {
      baseQuery.andWhere('entertainer.entertainerName LIKE :search', {
        search: `%${search}%`,
      });
    }
    if (vaccinated !== undefined) {
      baseQuery.andWhere('entertainer.vaccinated = :vaccinated', {
        vaccinated,
      });
    }

    // Add date availability filter
    if (date) {
      baseQuery.andWhere(
        `NOT EXISTS (
        SELECT 1 FROM booking b 
        WHERE b.entId = entertainer.id AND b.showDate = :blockedDate
      )`,
        { blockedDate: date },
      );
    }

    // Get total count BEFORE adding pagination
    const total = await baseQuery.getCount();

    // Get paginated records with all select fields using LIMIT and OFFSET
    const records = await baseQuery
      .select([
        'entertainer.id AS id',
        'entertainer.name AS name',
        'entertainer.entertainer_name AS entertainer_name',
        'entertainer.bio AS bio',
        'entertainer.email AS email',
        'entertainer.isPiqueVerified AS isPiqueVerified',
        'entertainer.socialLinks AS socialLinks',
        'entertainer.pricePerEvent AS pricePerEvent',
        'entertainer.zipCode AS ZipCode',
        "COALESCE(entertainer.services, '') AS services",
        'entertainer.contact_person AS contactPerson',
        'entertainer.contact_number AS ContactNumber',
        'entertainer.status AS status',
        'entertainer.mediaLink AS mediaLink',
        'entertainer.vaccinated AS vaccinated',
        'city.name AS city',
        'country.name AS country',
        'state.name AS state',
      ])
      .orderBy('entertainer.name', 'DESC')
      .limit(pageSize)
      .offset(skip)
      .getRawMany();

    // Process the records

    const parsedRecords = await Promise.all(
      records.map(
        async ({
          services,
          socialLinks,
          id,
          pricePerEvent,
          isPiqueVerified,
          ...rest
        }) => {
          const categories = await this.getFormattedCategories(Number(id));

          return {
            id: Number(id),
            services: services ? services.split(',') : [],
            isPiqueVerified: isPiqueVerified === 1 ? true : false, // Convert to boolean
            socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
            priceWithMarkup: await this.addMarkupToEntertainer(pricePerEvent),
            pricePerEvent,
            categories,
            ...rest,
          };
        },
      ),
    );

    return {
      message: 'Entertainers fetched successfully.',
      records: parsedRecords,
      total,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(total / pageSize), // Added for better pagination info
    };
  }

  async getEntertainerByentertainerId(entertainerId: number) {
    try {
      const res = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id =entertainer.userId')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')

        .leftJoin(
          (qb) =>
            qb
              .select([
                'media.user_id AS media_user_id',
                `IFNULL(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', media.id,
              'url', CONCAT(:serverUri, media.url),
              'type', media.type
            )
          ), 
          JSON_ARRAY()
        ) AS mediaDetails`,
              ])
              .from('entertainer_media', 'media')
              .groupBy('media.user_id'),
          'media',
          'media.media_user_id = entertainer.id',
        )

        .select([
          'entertainer.id AS id',
          'entertainer.name AS name',
          'entertainer.entertainer_name AS entertainer_name',
          'entertainer.mediaLink AS mediaLink',
          'entertainer.email AS email',
          'entertainer.city AS cityCode',
          'entertainer.state AS stateCode',
          'entertainer.country AS countryCode',
          'entertainer.isPiqueVerified AS isPiqueVerified',
          'entertainer.bio AS bio',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.zipCode AS ZipCode',
          'entertainer.vaccinated AS vaccinated',
          "COALESCE(entertainer.services, '') AS services",
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS ContactNumber',
          'entertainer.status AS status',
          'user.email AS email',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'COALESCE(media.mediaDetails, "[]") AS media',
          'user.createdByAdmin AS createdByAdmin',
        ])
        .where('entertainer.id=:entertainerId', { entertainerId })
        .setParameter('serverUri', this.config.get<string>('BASE_URL'))
        .getRawOne();

      const categories = await this.getFormattedCategories(
        Number(entertainerId),
      );

      if (res.createdByAdmin === 1) {
        const data = await this.tempRepository.findOne({
          where: { email: res.email },
        });
        res['password'] = data?.password;
      }
      return {
        message: 'Entertainer details fetched successfully',
        records: {
          id: Number(res.id),
          ...res,
          categories,
          isPiqueVerified: res.isPiqueVerified === 1 ? true : false,
          media: JSON.parse(res.media),
          socialLinks: JSON.parse(res.socialLinks),
          services: res.services ? res.services.split(',') : [],
        },
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: true,
      });
    }
  }

  async createEntertainer(
    dto: CreateEntertainerDto,
    uploadedFiles: UploadedFile[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { createLogin, user, entertainer } = dto;
    const {
      contactPerson,
      contactNumber,
      stageName,
      category,
      specific_category,
      ...restDetails
    } = entertainer;
    try {
      let savedUser = null;

      // 1. Create user if checkbox is checked
      if (createLogin) {
        const { password, ...rest } = user;
        const alreadyExists = await this.userRepository.findOne({
          where: { email: rest.email },
        });
        if (alreadyExists)
          throw new BadRequestException({ message: 'Email already in use' });

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
      const newEntertainer = this.entertainerRepository.create({
        name: stageName,
        contact_person: contactPerson,
        contact_number: contactNumber,
        ...restDetails,
        user: savedUser ? { id: savedUser.id } : null,
        status: 'active',
        profileStep: 10,
        isProfileComplete: true,
      });

      const savedEntertainer = await queryRunner.manager.save(newEntertainer);

      // Handle new Subcategory logic into this.
      const records = category.map((catId: number) => {
        return this.entCatRepository.create({
          entertainerId: savedEntertainer.id,
          category: { id: catId },
          subcategoryIds: [],
        });
      });

      await this.entCatRepository.save(records);

      for (const item of specific_category) {
        await this.entCatRepository.update(
          {
            entertainerId: savedEntertainer.id,
            category: { id: item.categoryId },
          },
          { subcategoryIds: item.subcategoryIds },
        );
      }

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleEntertainerMediaUpload(
          savedEntertainer.id,
          uploadedFiles,
        );
      }
      await queryRunner.commitTransaction();

      return {
        message: 'Enterainer Created Successfully with media .',
        status: true,
        data: savedEntertainer,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async updateAddress(id: number, dto: UpdateAddressDto) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id },
    });
    if (!entertainer) {
      throw new BadRequestException({ message: 'Entertainer not found' });
    }

    try {
      const city = await this.cityRepository.findOne({
        where: { id: dto.city },
        select: ['name'],
      });
      const state = await this.stateRepository.findOne({
        where: { id: dto.state },
        select: ['name'],
      });

      const fullAddress = `${dto.addressLine1 ?? ''}, ${dto.addressLine2 ?? ''}, ${city?.name ?? ''}, ${state?.name ?? ''} ${dto.zipCode}`;

      // To get latitude and Longitude
      const { lat, lng } = await this.geoService.geocodeAddress(fullAddress);
      let timezone = getTimezoneByLatLng(lat, lng);

      let payload = { ...dto, timezone, latitude: lat, longitude: lng };
      await this.entertainerRepository.update({ id: entertainer.id }, payload);

      return {
        message: 'Address updated Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async uploadMedia(
    id: number,
    uploadedFiles: UploadedFile[],
    mediaLink?: string[],
  ) {
    try {
      if (mediaLink)
        await this.entertainerRepository.update({ id }, { mediaLink });
      await this.mediaService.handleEntertainerMediaUpload(id, uploadedFiles);

      return {
        message: 'Media uploaded Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateSocialLinks(id: number, socialLinks) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id },
    });
    if (!entertainer) {
      throw new BadRequestException({ message: 'Entertainer not found' });
    }

    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { socialLinks: { ...socialLinks } },
      );
      return {
        message: 'Social Links updated Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async update(
    dto: UpdateEntertainerDto,
    entertainerId: number,
    uploadedFiles: UploadedFile[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { user, createLogin, entertainer } = dto;
    const {
      contactPerson,
      contactNumber,
      stageName,
      category,
      specific_category,
      ...restDetails
    } = entertainer;

    // Remove any undefined properties

    try {
      const entertainer = await queryRunner.manager.findOne(Entertainer, {
        where: { id: entertainerId },
        relations: ['user'],
      });

      if (!entertainer) {
        throw new NotFoundException('Entertainer not found');
      }

      const payload = {
        ...restDetails,
        contact_person: contactPerson ?? entertainer.contact_person,
        name: stageName ?? entertainer.name,
        contact_number: contactNumber ?? entertainer.contact_number,
      };

      const userId = entertainer?.user ? entertainer.user.id : null;
      const alreadyHaveLoginCredentials = entertainer?.user ? true : false;

      if (createLogin) {
        if (alreadyHaveLoginCredentials) {
          if (user.email !== entertainer.user.email) {
            const alreadyExists = await this.userRepository.findOne({
              where: { email: user.email },
            });
            if (alreadyExists)
              throw new BadRequestException({
                message:
                  'Email already taken by another user , cannot update your email. ',
              });
          }
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await this.userRepository.update(
            { id: userId },
            { email: user.email, password: hashedPassword },
          );
          await this.tempRepository.update(
            { email: entertainer.user.email },
            { email: user.email, password: user.password },
          );
        } else {
          const alreadyExists = await this.userRepository.findOne({
            where: { email: user.email },
          });

          if (alreadyExists)
            throw new BadRequestException({ message: 'Email already in use' });

          const hashedPassword = await bcrypt.hash(user.password, 10);
          const newUser = this.userRepository.create({
            email: user.email,
            password: hashedPassword,
            isVerified: true,
            createdByAdmin: true,
            role: 'entertainer',
          });
          const savedUser = await this.userRepository.save(newUser);
          await this.entertainerRepository.update(
            { id: entertainer.id },
            { user: { id: savedUser.id } },
          );
        }
      }
      // Also need chnages here
      await queryRunner.manager.update(
        Entertainer,
        { id: entertainer.id },
        payload,
      );
      // New Logic to update
      await this.entCatRepository.delete({ entertainerId: entertainer.id });
      const records = category.map((catId: number) => {
        return this.entCatRepository.create({
          entertainerId: entertainer.id,
          category: { id: catId },
          subcategoryIds: [],
        });
      });

      await this.entCatRepository.save(records);

      for (const item of specific_category) {
        await this.entCatRepository.update(
          {
            entertainerId: entertainer.id,
            category: { id: item.categoryId },
          },
          { subcategoryIds: item.subcategoryIds },
        );
      }

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleEntertainerMediaUpload(
          entertainer.id,
          uploadedFiles,
        );
      }
      await queryRunner.commitTransaction();
      return {
        message: 'Entertainer updated with media sucessfully ',
        status: true,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async getMainCategory() {
    // const categories = this.CategoryRepository.find({
    //   where: { parentId: 0 },
    // });

    const categories = await this.CategoryRepository.createQueryBuilder(
      'category',
    )
      .select([
        'category.id AS id',
        'category.name AS name',
        'category.iconUrl AS iconUrl',
        'category.parentId AS parentId',
        'category.catslug AS catslug',
      ])
      .where('category.parentId = :parentId', { parentId: 0 })
      .getRawMany();

    for (const category of categories) {
      const subCategories = await this.CategoryRepository.createQueryBuilder(
        'subcategory',
      )
        .select([
          'subcategory.id AS id',
          'subcategory.name AS name',
          'subcategory.parentId AS parentId',
          'subcategory.catslug AS catslug',
        ])
        .where('subcategory.parentId = :parentId', { parentId: category.id })
        .getRawMany();

      category.subCategories = subCategories;
    }

    return categories;
  }

  // Approve Entertainer
  async approveEntertainer(dto: ApproveEntertainer) {
    const { id, status } = dto;
    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      await this.entertainerRepository.update({ id }, { status });
      const currentYear = new Date().getFullYear();
      // Send Email to the User
      const statusToMessageMap = {
        active: 'activated',
        rejected: 'rejected',
        inactive: 'deactivated',
      };

      if (entertainer.user) {
        await this.userRepository.update(
          { id: entertainer.user.id },
          { status },
        );
        const statusToPayloadMap = {
          active: {
            to: entertainer.user.email,
            subject: 'Account Status',
            templateName: 'account-approved.html',
            replacements: { name: entertainer.user.name, year: currentYear },
          },
          inactive: {
            to: entertainer.user.email,
            subject: 'Account Status',
            templateName: 'account-deactivation.html',
            replacements: {
              User: entertainer.user.name,
              Date: new Date().getFullYear(),
              Year: currentYear,
            },
          },
          rejected: {
            to: entertainer.user.email,
            subject: 'Account Status',
            templateName: 'account-rejected.html',
            replacements: { name: entertainer.user.name, year: currentYear },
          },
        };

        const emailPayload = statusToPayloadMap[status];
        this.emailService.handleSendEmail(emailPayload);
      }

      return {
        message: `Entertainer profile ${statusToMessageMap[status]} Successfully`,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async getSubCategory(parentId: number[]) {
    const res = await this.CategoryRepository.find({
      where: { parentId: In(parentId) },
    });

    return res;
  }
  async categorybyId(id: number) {
    try {
      const category = await this.CategoryRepository.findOne({
        where: { id: id },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      return category;
    } catch (error) {
      throw new Error(`Error fetching category: ${error.message}`);
    }
  }

  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Categories> {
    const category = this.CategoryRepository.create({
      ...createCategoryDto,
      catslug: slugify(createCategoryDto.name),
    });

    return this.CategoryRepository.save(category);
  }

  async updateCategory(
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Categories> {
    const { id, name } = updateCategoryDto;
    const category = await this.CategoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new Error('Category not found');
    }
    category.name = name;
    return this.CategoryRepository.save(category);
  }
  async removeCategory(id: number) {
    const result = await this.CategoryRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Category not found');
    return 'Category Deleted';
  }

  async deleteEntertainer(id: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id },
    });

    if (!entertainer) {
      throw new NotFoundException({
        message: 'Entertainer Not Found',
        status: false,
      });
    }

    try {
      await this.entertainerRepository.remove(entertainer);
      return { message: 'Entertainer Deleted Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getEventDetailsByMonth(query: EventsByMonthDto) {
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
      const qb = this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoin('event', 'event', 'event.id = booking.eventId')
        .andWhere('YEAR(event.eventStartDateTime) = :year', { year })
        .andWhere('MONTH(event.eventStartDateTime) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.description AS description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
        ])
        .orderBy('DATE(event.eventStartDateTime)', 'ASC');

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

  // async saveEntertainerAvailability(dto: EntertainerAvailabilityDto) {
  //   try {
  //     const { entertainer_id, ...rest } = dto;

  //     const alreadyExists = await this.availabilityRepository.findOne({
  //       where: { entertainer_id, year: dto.year, month: dto.month },
  //     });

  //     // if (alreadyExists) {
  //     //   await this.availabilityRepository.update(
  //     //     { id: alreadyExists.id },
  //     //     { ...rest },
  //     //   );
  //     // }

  //     // const availability = this.availabilityRepository.create(dto);
  //     const savedAvailability =
  //       await this.availabilityRepository.save(availability);
  //     return {
  //       message: 'Entertainer Availability returned Successfully',
  //       data: savedAvailability,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: error.message,
  //       status: false,
  //     });
  //   }
  // }
  async getEntertainerAvailability(id: number, year: number, month: number) {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { entertainer_id: id, year, month },
      });

      return {
        message: 'Entertainer Availability returned Successfully',
        data: availability,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateEntertainerAvailability(id: number, dto: UpdateAvailabilityDto) {
    try {
      const plainDto = instanceToPlain(dto);
      const availability = await this.availabilityRepository.findOne({
        where: {
          entertainer_id: id,
          year: plainDto.year,
          month: plainDto.month,
        },
      });

      if (!availability) {
        const avail = this.availabilityRepository.create({
          entertainer_id: id,
          ...plainDto,
        });
        const savedAvailability = await this.availabilityRepository.save(avail);
        return {
          message: 'Entertainer availability Saved successfully',
          data: savedAvailability,
          status: true,
        };
      }

      const updatedAvailability = await this.availabilityRepository.update(
        { id: availability.id },
        plainDto,
      );
      return {
        message: 'Entertainer availability updated successfully',
        data: dto,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getAllEntertainerList(eventId: number, query: GetEntertainerDto) {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      const { page = 1, pageSize = 10, search = '', vaccinated } = query;
      const skip = (page - 1) * pageSize;

      const eventCategories = await this.eventCategoriesRepository.find({
        where: { event: { id: eventId } },
        select: ['categoryId', 'subCategoryId'],
      });

      if (!eventCategories || eventCategories.length === 0) {
        throw new NotFoundException(`No categories linked to event ${eventId}`);
      }

      // STEP 2: Build dynamic WHERE clause for all category–subcategory pairs
      const conditions: string[] = [];
      const params: Record<string, any> = {};

      eventCategories.forEach((ecs, i) => {
        conditions.push(
          `(ent_cat_subcat.category_id = :cat${i} AND FIND_IN_SET(:sub${i}, ent_cat_subcat.subcategory_ids))`,
        );
        params[`cat${i}`] = ecs.categoryId;
        params[`sub${i}`] = ecs.subCategoryId;
      });

      const baseQuery = this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin(
          'entertainer_category_subcategories',
          'ent_cat_subcat',
          `ent_cat_subcat.entertainer_id = entertainer.id AND (${conditions.join(' OR ')})`,
          params,
        )

        .where('entertainer.status IN (:...statuses)', {
          statuses: ['active'],
        })

        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from('booking', 'book')
            .where('book.entId = entertainer.id') // booking belongs to entertainer
            .andWhere('book.eventId = :eventId') // booking is for this event
            .andWhere('book.status IN (:...bookStats)', {
              bookStats: ['invited', 'applied'], // only these statuses matter
            })
            .getQuery();

          return `NOT EXISTS ${subQuery}`;
        })

        .setParameter('eventId', eventId)
        .setParameter('todayString', todayString)

        // Use select() for main fields with proper aliases
        .select([
          'entertainer.id AS id',
          'entertainer.name AS name',
          'entertainer.entertainer_name AS entertainer_name',
          'entertainer.bio AS bio',
          'entertainer.email AS email',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.zipCode AS ZipCode',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS ContactNumber',
          'entertainer.status AS status',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.vaccinated AS vaccinated',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
        ])

        // Previous booking full timestamp
        .addSelect(
          `(
    SELECT b1.showStartDateTime
    FROM booking b1
    JOIN venue v1 ON v1.id = b1.venueId
    WHERE b1.entId = entertainer.id
      AND b1.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b1.showStartDateTime) < '${todayString}'
    ORDER BY b1.showStartDateTime DESC
    LIMIT 1
  )`,
          'previousBookingDate',
        )

        // Previous booking timezone
        .addSelect(
          `(
    SELECT v1.timezone
    FROM booking b1
    JOIN venue v1 ON v1.id = b1.venueId
    WHERE b1.entId = entertainer.id
      AND b1.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b1.showStartDateTime) < '${todayString}'
    ORDER BY b1.showStartDateTime DESC
    LIMIT 1
  )`,
          'previousBookingTimezone',
        )

        // Upcoming booking full timestamp
        .addSelect(
          `(
    SELECT b2.showStartDateTime
    FROM booking b2
    JOIN venue v2 ON v2.id = b2.venueId
    WHERE b2.entId = entertainer.id
      AND b2.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b2.showStartDateTime) > '${todayString}'
    ORDER BY b2.showStartDateTime ASC
    LIMIT 1
  )`,
          'upcomingBookingDate',
        )

        // Upcoming booking timezone
        .addSelect(
          `(
    SELECT v2.timezone
    FROM booking b2
    JOIN venue v2 ON v2.id = b2.venueId
    WHERE b2.entId = entertainer.id
      AND b2.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b2.showStartDateTime) > '${todayString}'
    ORDER BY b2.showStartDateTime ASC
    LIMIT 1
  )`,
          'upcomingBookingTimezone',
        );

      if (search) {
        baseQuery.andWhere('entertainer.name LIKE :search', {
          search: `%${search}%`,
        });
      }
      if (vaccinated) {
        baseQuery.andWhere('entertainer.vaccinated = :vaccinated', {
          vaccinated,
        });
      }

      const total = await baseQuery.getCount();

      const records = await baseQuery
        .orderBy('entertainer.name', 'DESC')
        .skip(skip)
        .take(pageSize)
        .getRawMany();
      const parsedRecords = await Promise.all(
        records.map(
          async ({
            services,
            id,
            pricePerEvent,
            socialLinks,
            previousBookingDate,
            upcomingBookingDate,
            ...rest
          }) => {
            const [categoryData] = await this.getFormattedCategoriesforAdmin(
              [Number(id)],
              eventCategories, // pass event's allowed categories
            );

            const categories = categoryData?.categories || [];

            return {
              id: Number(id),
              services: services ? services.split(',') : [],
              socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
              pricePerEvent,
              categories,
              previousBookingDate: convertUtcToTimezoneString(
                previousBookingDate,
                rest.previousBookingTimezone,
              ),
              upcomingBookingDate: convertUtcToTimezoneString(
                upcomingBookingDate,
                rest.upcomingBookingTimezone,
              ),
              ...rest,
            };
          },
        ),
      );

      return {
        message: 'Entertainers fetched Successfully.',
        records: parsedRecords,
        total,
        pageSize,
        currentPage: page,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async getAllEntertainerListForSeries(seriesId: number, query: any) {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const { page = 1, pageSize = 10, search = '', vaccinated } = query;
      const skip = (page - 1) * pageSize;

      const events = await this.eventRepository.find({
        where: { series: { id: seriesId } },
        select: ['categoryId', 'subCategoryId', 'id'],
      });

      if (!events.length)
        return { message: 'No events found', records: [], total: 0 };

      const categoryIds = [...new Set(events.map((e) => e.categoryId))];
      const subCategoryIds = [...new Set(events.map((e) => e.subCategoryId))];
      const eventIds = events.map((e) => e.id);

      const baseQuery = this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin(
          'entertainer_category_subcategories',
          'ent_cat_subcat',
          `ent_cat_subcat.entertainer_id = entertainer.id AND ent_cat_subcat.category_id IN (:...categoryIds)`,
          { categoryIds },
        )
        .where("entertainer.status = 'active'")
        .andWhere(
          new Brackets((qb) => {
            subCategoryIds.forEach((subId, i) => {
              qb.orWhere(
                `FIND_IN_SET(:subId${i}, ent_cat_subcat.subcategory_ids)`,
                { [`subId${i}`]: subId },
              );
            });
          }),
        )
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from('booking', 'book')
            .where('book.entId = entertainer.id')
            .andWhere('book.eventId IN (:...eventIds)')
            .andWhere("book.status IN ('invited', 'applied')")
            .getQuery();
          return `NOT EXISTS ${subQuery}`;
        })
        .setParameter('eventIds', eventIds)
        .distinct(true) // ✅ Ensure unique entertainers
        .select([
          'entertainer.id AS id',
          'entertainer.name AS name',
          'entertainer.entertainer_name AS entertainer_name',
          'entertainer.bio AS bio',
          'entertainer.email AS email',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.zipCode AS ZipCode',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS ContactNumber',
          'entertainer.status AS status',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.vaccinated AS vaccinated',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
        ])
        .addSelect(
          `(
    SELECT b1.showStartDateTime
    FROM booking b1
    JOIN venue v1 ON v1.id = b1.venueId
    WHERE b1.entId = entertainer.id
      AND b1.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b1.showStartDateTime) < '${todayString}'
    ORDER BY b1.showStartDateTime DESC
    LIMIT 1
  )`,
          'previousBookingDate',
        )

        // Previous booking timezone
        .addSelect(
          `(
    SELECT v1.timezone
    FROM booking b1
    JOIN venue v1 ON v1.id = b1.venueId
    WHERE b1.entId = entertainer.id
      AND b1.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b1.showStartDateTime) < '${todayString}'
    ORDER BY b1.showStartDateTime DESC
    LIMIT 1
  )`,
          'previousBookingTimezone',
        )

        // Upcoming booking full timestamp
        .addSelect(
          `(
    SELECT b2.showStartDateTime
    FROM booking b2
    JOIN venue v2 ON v2.id = b2.venueId
    WHERE b2.entId = entertainer.id
      AND b2.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b2.showStartDateTime) > '${todayString}'
    ORDER BY b2.showStartDateTime ASC
    LIMIT 1
  )`,
          'upcomingBookingDate',
        )

        // Upcoming booking timezone
        .addSelect(
          `(
    SELECT v2.timezone
    FROM booking b2
    JOIN venue v2 ON v2.id = b2.venueId
    WHERE b2.entId = entertainer.id
      AND b2.status IN ('invited', 'completed', 'applied', 'confirmed')
      AND DATE(b2.showStartDateTime) > '${todayString}'
    ORDER BY b2.showStartDateTime ASC
    LIMIT 1
  )`,
          'upcomingBookingTimezone',
        );

      if (search)
        baseQuery.andWhere('entertainer.name LIKE :search', {
          search: `%${search}%`,
        });

      if (vaccinated)
        baseQuery.andWhere('entertainer.vaccinated = :vaccinated', {
          vaccinated,
        });

      const total = await baseQuery.getCount();

      const records = await baseQuery
        .orderBy('entertainer.name', 'ASC')
        .skip(skip)
        .take(pageSize)
        .getRawMany();

      const parsedRecords = await Promise.all(
        records.map(async (r) => {
          // Get categories for this entertainer
          const categories = await this.getFormattedCategoriesforAdminMultiple(
            Number(r.id),
            events.map((e) => ({
              categoryId: e.categoryId,
              subCategoryId: e.subCategoryId,
            })),
          );

          return {
            ...r,
            id: Number(r.id),
            socialLinks: r.socialLinks ? JSON.parse(r.socialLinks) : null,
            previousBookingDate: convertUtcToTimezoneString(
              r.previousBookingDate,
              r.previousBookingTimezone,
            ),
            upcomingBookingDate: convertUtcToTimezoneString(
              r.upcomingBookingDate,
              r.upcomingBookingTimezone,
            ),
            categories,
          };
        }),
      );

      return {
        message: 'Entertainers fetched successfully.',
        records: parsedRecords,
        total,
        pageSize,
        currentPage: page,
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
  // For Setting up verification (isPiqueVerified) flag
  async toggleVerificationFlag(entertainerId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id: entertainerId },
    });
    if (!entertainer) {
      throw new NotFoundException('Entertainer do not exists.');
    }

    await this.entertainerRepository.update(
      { id: entertainerId },
      { isPiqueVerified: !entertainer.isPiqueVerified },
    );

    const savedVerification = await this.entertainerRepository.findOne({
      where: { id: entertainerId },
      select: ['isPiqueVerified'],
    });

    return {
      message: 'Entertainer profile verification toggled successfully.',
      data: savedVerification,
      status: true,
    };
  }

  async getFormattedCategories(entertainerId: number) {
    try {
      const rawCategories = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id') // Category relation
        .where('ecs.entertainerId = :entertainerId', { entertainerId })
        .select([
          'cat.id AS categoryId',
          'cat.name AS categoryName',
          'ecs.subcategoryIds AS subcategoryIds',
        ])
        .getRawMany();

      const subcategoryIds = rawCategories.flatMap((row) =>
        typeof row.subcategoryIds === 'string'
          ? row.subcategoryIds.split(',').map(Number)
          : [],
      );

      const uniqueSubcategoryIds = [...new Set(subcategoryIds)];

      //   Now get all the subcategory
      const subcategories = await this.CategoryRepository.find({
        where: { id: In(uniqueSubcategoryIds) },
        select: ['id', 'name', 'catslug', 'parentId'],
      });

      const formatted = rawCategories.map((row) => {
        const subcatIds =
          typeof row.subcategoryIds === 'string'
            ? row.subcategoryIds.split(',').map(Number)
            : [];

        const specific_category = subcategories
          .filter((sub) => subcatIds.includes(sub.id))
          .map((sub) => ({
            id: sub.id,
            specificCategoryName: sub.name,
          }));

        return {
          id: row.categoryId,
          categoryName: row.categoryName,
          specific_category,
        };
      });

      return formatted ?? null;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async setEntertainerRateCard(dto: EntertainerRateCardDto) {
    const { rates } = dto;
    try {
      if (rates && rates.length > 0) {
        for (const rate of rates) {
          const alreadyExists = await this.entRateRepository.findOne({
            where: {
              subcategoryId: rate.subcategoryId,
              entertainerId: rate.entertainerId,
            },
          });

          if (alreadyExists) {
            await this.entRateRepository.update({ id: alreadyExists.id }, rate);
          } else {
            const newCategoryRate = this.entRateRepository.create(rate);
            await this.entRateRepository.save(newCategoryRate);
          }
        }
      }
      return {
        message: 'Entertainer rate card set successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEntertainerRateCard(entertainerId: number) {
    try {
      const entertainerRateCard = await this.entRateRepository
        .createQueryBuilder('rate')
        .leftJoin('categories', 'subcat', 'subcat.id = rate.subcategoryId')
        .select([
          'subcat.id AS subCategoryId',
          'subcat.name AS subCategoryName',
          'rate.basePrice AS basePrice',
          'rate.pricePerExtra30Min AS pricePerExtra30Min',
        ])
        .where('rate.entertainerId = :entertainerId', { entertainerId }) // Ensure we only get rates with entertainerId
        .getRawMany();
      return {
        message: 'Entertainer rate card  fetched successfully.',
        data: entertainerRateCard,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getFormattedCategoriesforAdmin(
    entertainerIds: number[],
    eventCategories?: { categoryId: number; subCategoryId: number }[],
  ) {
    try {
      if (!entertainerIds?.length) return [];

      // STEP 1: Fetch all categories/subcategories linked to entertainer(s)
      const rawRecords = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id')
        .where('ecs.entertainerId IN (:...entertainerIds)', { entertainerIds })
        .select([
          'ecs.entertainerId AS entertainerId',
          'cat.id AS categoryId',
          'cat.name AS categoryName',
          'ecs.subcategoryIds AS subcategoryIds',
        ])
        .getRawMany();

      if (!rawRecords.length) return [];

      // STEP 2: Collect all subcategory IDs used by entertainers
      const allSubcategoryIds = [
        ...new Set(
          rawRecords.flatMap((r) =>
            typeof r.subcategoryIds === 'string'
              ? r.subcategoryIds.split(',').map(Number)
              : [],
          ),
        ),
      ];

      const subcategories = await this.CategoryRepository.find({
        where: { id: In(allSubcategoryIds) },
        select: ['id', 'name', 'catslug', 'parentId'],
      });

      // Convert eventCategories into a lookup map for easy filtering
      const eventCategoryMap = new Map<number, number[]>();
      if (eventCategories?.length) {
        for (const { categoryId, subCategoryId } of eventCategories) {
          if (!eventCategoryMap.has(categoryId)) {
            eventCategoryMap.set(categoryId, []);
          }
          eventCategoryMap.get(categoryId).push(subCategoryId);
        }
      }

      // STEP 3: Group entertainer categories
      const resultMap = new Map<number, any[]>();

      for (const record of rawRecords) {
        const subcatIds =
          typeof record.subcategoryIds === 'string'
            ? record.subcategoryIds.split(',').map(Number)
            : [];

        // filter by event category/subcategory if eventCategories provided
        const allowedSubIds = eventCategoryMap.get(record.categoryId) || [];
        const filteredSubIds = eventCategories
          ? subcatIds.filter((id) => allowedSubIds.includes(id))
          : subcatIds;

        if (!filteredSubIds.length && eventCategories) continue; // skip non-matching

        const specificCategories = subcategories
          .filter((sub) => filteredSubIds.includes(sub.id))
          .map((sub) => ({
            id: sub.id,
            specificCategoryName: sub.name,
          }));

        const formattedCategory = {
          id: record.categoryId,
          categoryName: record.categoryName,
          specific_category: specificCategories,
        };

        if (!resultMap.has(record.entertainerId)) {
          resultMap.set(record.entertainerId, []);
        }

        resultMap.get(record.entertainerId).push(formattedCategory);
      }

      return entertainerIds.map((entertainerId) => ({
        entertainerId,
        categories: resultMap.get(entertainerId) || [],
      }));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getFormattedCategoriesforAdminMultiple(
    entertainerId,
    categorySubcatPairs = [],
  ) {
    try {
      // Example of categorySubcatPairs:
      // [{ categoryId: 2, subCategoryId: 5 }, { categoryId: 3, subCategoryId: 8 }]

      if (!categorySubcatPairs.length) return [];

      const query = this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id')
        .where('ecs.entertainerId = :entertainerId', { entertainerId })
        .select([
          'cat.id AS categoryId',
          'cat.name AS categoryName',
          'ecs.subcategoryIds AS subcategoryIds',
        ]);

      const rawCategories = await query.getRawMany();
      if (!rawCategories.length) return [];

      // Extract all subcategory IDs entertainer has
      const allSubcategoryIds = rawCategories.flatMap((row) =>
        typeof row.subcategoryIds === 'string'
          ? row.subcategoryIds.split(',').map(Number)
          : [],
      );

      // Collect all subCategoryIds used in series events
      const filterSubcategoryIds = categorySubcatPairs.map(
        (p) => p.subCategoryId,
      );
      const filteredSubcategoryIds = allSubcategoryIds.filter((id) =>
        filterSubcategoryIds.includes(id),
      );

      if (!filteredSubcategoryIds.length) return [];

      // Get all matching subcategories
      const subcategories = await this.CategoryRepository.find({
        where: { id: In(filteredSubcategoryIds) },
        select: ['id', 'name', 'catslug', 'parentId'],
      });

      // Map formatted data
      const formatted = rawCategories
        .map((row) => {
          const subcatIds =
            typeof row.subcategoryIds === 'string'
              ? row.subcategoryIds.split(',').map(Number)
              : [];

          const specific_category = subcategories
            .filter((sub) => subcatIds.includes(sub.id))
            .filter((sub) =>
              categorySubcatPairs.some(
                (pair) =>
                  pair.categoryId === row.categoryId &&
                  pair.subCategoryId === sub.id,
              ),
            )
            .map((sub) => ({
              id: sub.id,
              specificCategoryName: sub.name,
            }));

          if (!specific_category.length) return null;

          return {
            id: row.categoryId,
            categoryName: row.categoryName,
            specific_category,
          };
        })
        .filter(Boolean);

      return formatted;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
