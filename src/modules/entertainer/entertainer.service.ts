import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  // CreateEntertainerDto,
  Step1Dto,
  Step2Dto,
  Step3Dto,
  Step4Dto,
  Step5Dto,
  Step6Dto,
  Step7Dto,
  Step8Dto,
  Step9Dto,
} from './dto/create-entertainer.dto';
import {
  AddressDto,
  GeneralInformationDto,
  socialLinksDto,
  UpdateEntertainerDto,
  UpdateStep1Dto,
  UpdateStep2Dto,
  UpdateStep3Dto,
  UpdateStep4Dto,
  UpdateStep5Dto,
  UpdateStep6Dto,
  UpdateStep8Dto,
} from './dto/update-entertainer.dto';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Category } from './entities/categories.entity';
import { Media } from '../media/entities/media.entity';
import { DashboardDto } from './dto/dashboard.dto';
import { Invoice } from '../invoice/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';
import { MediaService } from '../media/media.service';
import { UploadedFile } from 'src/common/types/media.type';
import { UpcomingEventDto } from './dto/upcoming-event.dto';
import { EventsByMonthDto } from './dto/get-events-bymonth.dto';
import { BookingQueryDto } from './dto/booking-query-dto';
import { VenueEvent } from '../event/entities/event.entity';
import { GeneralInfoDto } from '../admin/entertainer/Dto/create-entertainer.dto';
import { GeocodingService } from '../location/geocoding.service';
import { States } from '../location/entities/state.entity';
import { Cities } from '../location/entities/city.entity';
import { NotificationService } from '../notification/notification.service';
import { AdminUser } from '../admin/auth/entities/AdminUser.entity';
import {
  getTimezoneByCity,
  getTimezoneByLatLng,
} from 'src/common/utils/slots-utils';
import { EntertainerCategorySubcategory } from './entities/entertainer-category-subcategory.entity';
import { EntertainerRateCard } from './entities/entertainer-rate-card.entity';
import { EntertainerRateCardDto } from './dto/rate-card.dto';
import { EntertainerInvoice } from '../invoice/entities/entertainer-invoice.entity';

@Injectable()
export class EntertainerService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(EntertainerInvoice)
    private readonly entInvoiceRepository: Repository<EntertainerInvoice>,
    @InjectRepository(Cities)
    private readonly cityRepository: Repository<Cities>,
    @InjectRepository(States)
    private readonly stateRepository: Repository<States>,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    @InjectRepository(EntertainerCategorySubcategory)
    private readonly entCatRepository: Repository<EntertainerCategorySubcategory>,
    @InjectRepository(EntertainerRateCard)
    private readonly entRateRepository: Repository<EntertainerRateCard>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly geoService: GeocodingService,
    private readonly notificationService: NotificationService,
  ) {}

  // New Flow // Step1
  async saveBasicDetails(dto: Step1Dto, userId: number) {
    const { step, ...rest } = dto;
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const entertainer = this.entertainerRepository.create({
        name: dto.stageName,
        email: user?.email,
        entertainerName: dto.entertainerName,
        user: { id: userId },
        profileStep: 1,
        ...rest,
      });

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
      // To get timezone based on city
      let timezone = getTimezoneByLatLng(lat, lng);

      const newPayload = {
        ...entertainer,
        latitude: lat,
        longitude: lng,
        timezone,
        pricePerEvent: 200,
      };

      const savedEntertainer =
        await this.entertainerRepository.save(newPayload);
      return {
        message: 'Entertainer primary details saved successfully',
        status: true,
        step: 1,
        data: savedEntertainer,
        nextStep: Number('02'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveBio(dto: Step2Dto, userId: number) {
    const { bio } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 2, bio },
      );
      return {
        message: 'Bio saved Successfully',
        status: true,
        step: 2,
        data: bio,
        nextStep: Number('03'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async vaccinationStatus(dto: Step3Dto, userId: number) {
    const { vaccinated } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 3, vaccinated },
      );
      return {
        message: 'Vaccination status saved Successfully',
        status: true,
        step: 3,
        data: vaccinated,
        nextStep: Number('04'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async contactDetails(dto: Step4Dto, userId: number) {
    const { contactPerson, contactNumber } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }

    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        {
          profileStep: 4,
          contact_person: contactPerson,
          contact_number: contactNumber,
        },
      );
      return {
        message: 'Contact Details saved Successfully',
        status: true,
        data: { contact_person: contactPerson, contact_number: contactNumber },
        step: 4,
        nextStep: Number('05'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async socialLinks(dto: Step5Dto, userId: number) {
    const { socialLinks } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 5, socialLinks: { ...socialLinks } },
      );
      return {
        message: 'Social Links  saved Successfully',
        status: true,
        data: socialLinks,
        step: 5,
        nextStep: Number('06'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveCategory(dto: Step6Dto, userId: number) {
    const { category } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException('Entertainer not found');
    }

    try {
      // Delete the existing records
      await this.entCatRepository.delete({ entertainerId: entertainer.id });

      // Create new empty records (subcategoryIds will be added in step 7)
      const records = category.map((catId: number) => {
        return this.entCatRepository.create({
          entertainerId: entertainer.id,
          category: { id: catId },
          subcategoryIds: [],
        });
      });

      await this.entCatRepository.save(records);

      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 6 },
      );
      return {
        message: 'Category saved Successfully',
        status: true,
        data: category,
        step: 6,
        nextStep: Number('07'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async saveSpecificCategory(dto: Step7Dto, userId: number) {
    const { specific_category } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!entertainer) {
      throw new BadRequestException('Entertainer not found');
    }
    try {
      for (const item of specific_category) {
        await this.entCatRepository.update(
          { entertainerId: entertainer.id, category: { id: item.categoryId } },
          { subcategoryIds: item.subcategoryIds },
        );
      }

      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 7 },
      );
      return {
        message: 'Specific Category saved Successfully',
        status: true,
        step: 7,
        data: specific_category,
        nextStep: Number('08'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  // async performanceRole(dto: Step8Dto, userId: number) {
  //   const { performanceRole } = dto;
  //   const entertainer = await this.entertainerRepository.findOne({
  //     where: { user: { id: userId } },
  //   });
  //   if (!entertainer) {
  //     throw new BadRequestException({
  //       mesage: 'Entertainer not found',
  //       status: false,
  //     });
  //   }
  //   try {
  //     await this.entertainerRepository.update(
  //       { id: entertainer.id },
  //       { profileStep: 8, performanceRole },
  //     );
  //     return {
  //       message: 'Performance role saved Successfully',
  //       status: true,
  //       step: 8,
  //       data: performanceRole,
  //       nextStep: Number('09'),
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: error.message,
  //       status: false,
  //     });
  //   }
  // }

  async saveSkills(dto: Step9Dto, userId: number) {
    const { services } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) {
      throw new BadRequestException({
        mesage: 'Entertainer not found',
        status: false,
      });
    }
    try {
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { profileStep: 8, services },
      );
      return {
        message: 'Skills saved Successfully',
        status: true,
        data: services,
        step: 8,
        nextStep: Number('09'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // save Media
  async saveMedia(userId: number) {
    try {
      const ent = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      this.entertainerRepository.update(
        { id: ent.id },
        { profileStep: 9, isProfileComplete: false },
      );

      return {
        message: 'media uploaded successfully',
        status: true,
        step: 9,
        nextStep: '10',
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async uploadMedia(userId: number, uploadedFiles: UploadedFile[]) {
    const ent = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!ent) {
      throw new BadRequestException({
        message: 'Entertainer Not Found',
        status: false,
      });
    }

    try {
      const { data } = await this.mediaService.handleEntertainerMediaUpload(
        Number(ent.id),
        uploadedFiles,
        { eventId: null },
      );

      return {
        message: 'Media uploaded Successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async saveEntertainerDetails(userId: number, body) {
    try {
      const { mediaLink } = body;

      const ent = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      await this.entertainerRepository.update(
        { id: ent.id },
        {
          mediaLink: mediaLink,
          isProfileComplete: true,
          status: 'active',
          profileStep: 10,
        },
      );

      // Temporary Code for Removal
      await this.userRepository.update({ id: userId }, { status: 'active' });

      let admins = await this.adminRepository.find({ where: { role: '1' } });
      if (admins?.length > 0) {
        const message = `An entertainer has completed their profile. Please review and approve.`;
        const notification_payload = {
          title: 'New Entertainer Profile Submitted',
          body: message,
          type: 'profile_completion',
        };
        for (const admin of admins) {
          await this.notificationService.sendAdminPush(
            notification_payload,
            Number(admin.id),
          );
        }
      }

      return {
        message: 'Entertainer  is created sucessfully with media.',
        step: 10,
        status: true,
      };
      // Notification to Admin
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  // Update Logic Lies Here

  async updateBasicDetails(dto: UpdateStep1Dto, userId: number) {
    const { step, stageName, ...rest } = dto;
    let newPayload = { ...rest };
    if (stageName) newPayload['name'] = stageName;

    const city = await this.cityRepository.findOne({
      where: { id: dto.city },
      select: ['name'],
    });
    const state = await this.stateRepository.findOne({
      where: { id: dto.state },
      select: ['name'],
    });

    const fullAddress = `${dto.addressLine1 ?? ''}, ${dto.addressLine2 ?? ''}, ${city?.name ?? ''}, ${state?.name ?? ''} ${dto.zipCode}`;

    const { lat, lng } = await this.geoService.geocodeAddress(fullAddress);
    newPayload['latitude'] = lat;
    newPayload['latitude'] = lng;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');
    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        newPayload,
      );
      return {
        message: 'Entertainer primary details updated successfully',
        status: true,
        step: 1,
        data: rest,
        nextStep: Number('02'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updateBio(dto: UpdateStep2Dto, userId: number) {
    const { bio } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entertainerRepository.update(
        {
          user: { id: userId },
        },
        { bio },
      );
      return {
        message: 'Bio updated Successfully',
        status: true,
        step: 2,
        data: bio,
        nextStep: Number('03'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updateVaccinationStatus(dto: UpdateStep3Dto, userId: number) {
    const { vaccinated } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        { vaccinated },
      );
      return {
        message: 'Vaccination status updated Successfully',
        status: true,
        step: 3,
        data: vaccinated,
        nextStep: Number('04'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateContactDetails(dto: UpdateStep4Dto, userId: number) {
    const { contactPerson, contactNumber } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        {
          contact_person: contactPerson,
          contact_number: contactNumber,
        },
      );
      return {
        message: 'Contact Details updated Successfully',
        status: true,
        data: { contact_person: contactPerson, contact_number: contactNumber },
        step: 4,
        nextStep: Number('05'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updateSocialLinks(dto: UpdateStep5Dto, userId: number) {
    const { socialLinks } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        { socialLinks: { ...socialLinks } },
      );
      return {
        message: 'Social Links updated Successfully',
        status: true,
        data: socialLinks,
        step: 5,
        nextStep: Number('06'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // Need Changes in this
  async updateCategory(dto: UpdateStep6Dto, userId: number) {
    const { category } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entCatRepository.delete({ entertainerId: entertainer.id });

      // Create new empty records (subcategoryIds will be added in step 7)
      const records = category.map((catId: number) => {
        return this.entCatRepository.create({
          entertainerId: entertainer.id,
          category: { id: catId },
          subcategoryIds: [],
        });
      });

      await this.entCatRepository.save(records);
      return {
        message: 'Category saved Successfully',
        status: true,
        data: category,
        step: 6,
        nextStep: Number('07'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  // This needs to be changed
  async updateSpecificCategory(dto: Step7Dto, userId: number) {
    const { specific_category } = dto;

    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      for (const item of specific_category) {
        await this.entCatRepository.update(
          { entertainerId: entertainer.id, category: { id: item.categoryId } },
          { subcategoryIds: item.subcategoryIds },
        );
      }
      return {
        message: 'Specific category updated successfully',
        status: true,
        step: 7,
        data: specific_category,
        nextStep: Number('08'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updatePerformanceRole(dto: UpdateStep8Dto, userId: number) {
    const { performanceRole } = dto;

    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        { performanceRole },
      );
      return {
        message: 'Performance role updated Successfully',
        status: true,
        step: 8,
        data: performanceRole,
        nextStep: Number('09'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async updateSkills(dto: Step9Dto, userId: number) {
    const { services } = dto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!entertainer) throw new NotFoundException('Entertainer not found');

    try {
      await this.entertainerRepository.update(
        { user: { id: userId } },
        { services },
      );
      return {
        message: 'Services updated Successfully',
        status: true,
        data: services,
        step: 8,
        nextStep: Number('09'),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async findEntertainer(userId: number) {
    const URL = this.config.get<string>('DEFAULT_MEDIA');
    const ent = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });
    try {
      const entertainer = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category ')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category ',
        )
        .where('entertainer.id = :userId', {
          userId: ent.id,
        })
        .select([
          'entertainer.id AS id',
          'entertainer.name AS stageName',
          'entertainer.entertainer_name AS entertainerName',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'entertainer.isPiqueVerified AS isPiqueVerified',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.city AS city_code',
          'entertainer.state AS state_code',
          'entertainer.country AS country_code',
          'entertainer.zipCode AS zipCode',
          'entertainer.maxTravelDistanceMiles AS maxTravelDistance',
          'entertainer.services AS services',
          'entertainer.mediaLink AS mediaLink',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.contact_person AS contactPerson',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'entertainer.profileStep AS profileStep',
          'entertainer.isProfileComplete AS isProfileComplete',
          'entertainer.category AS category',
          'entertainer.timezone AS timezone',
          'entertainer.specific_category AS specific_category',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM entertainer_media m WHERE m.user_id= entertainer.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

      //  Getting Raw Categories
      const rawCategories = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id') // Category relation
        .where('ecs.entertainerId = :entertainerId', { entertainerId: ent.id })
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
      const subcategories = await this.categoryRepository.find({
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

      const { socialLinks, services, id, isPiqueVerified, ...rest } =
        entertainer;

      const payload = {
        id: Number(id),
        services: services ? services.split(',') : [],
        isPiqueVerified: isPiqueVerified === 1 ? true : false,
        ...rest,
        socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
        categories: formatted,
      };

      return {
        message: 'Entertainer Fetched Successfully',
        data: payload,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findEntertainerById(userId: number) {
    const URL = this.config.get<string>('DEFAULT_MEDIA');
    const entertainer = await this.entertainerRepository.findOne({
      where: { id: userId },
    });

    if (!entertainer)
      return {
        message: 'No entertainer Found',
        data: null,
        status: false,
      };

    try {
      const entertainer = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category ')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category ',
        )
        .where('entertainer.id = :userId', {
          userId,
        })
        .select([
          'entertainer.id AS id',
          'entertainer.name AS stageName',
          'entertainer.entertainer_name AS entertainerName',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'entertainer.isPiqueVerified AS isPiqueVerified',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.city AS city_code',
          'entertainer.state AS state_code',
          'entertainer.country AS country_code',
          'entertainer.zipCode AS zipCode',
          'entertainer.maxTravelDistanceMiles AS maxTravelDistance',
          'entertainer.services AS services',
          'entertainer.mediaLink AS mediaLink',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.contact_person AS contactPerson',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'entertainer.profileStep AS profileStep',
          'entertainer.timezone AS timezone',
          'entertainer.isProfileComplete AS isProfileComplete',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM entertainer_media m WHERE m.user_id= entertainer.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

      //  Getting Raw Categories
      const rawCategories = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id') // Category relation
        .where('ecs.entertainerId = :entertainerId', { entertainerId: userId })
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
      const subcategories = await this.categoryRepository.find({
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

      const { socialLinks, services, id, isPiqueVerified, ...rest } =
        entertainer;

      const payload = {
        id: Number(id),
        services: services ? services.split(',') : [],
        isPiqueVerified: isPiqueVerified === 1 ? true : false,
        ...rest,
        socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
        categories: formatted,
      };
      return {
        message: 'Entertainer Fetched Successfully',
        data: payload,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async findEntertainerByUserId(userId: number) {
    const URL = this.config.get<string>('DEFAULT_MEDIA');
    const entertainerData = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!entertainerData)
      return {
        message: 'No entertainer Found',
        data: null,
        status: false,
      };

    try {
      const entertainer = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin('countries', 'country', 'country.id = entertainer.country')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category ')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category ',
        )
        .where('entertainer.id = :userId', {
          userId: entertainerData.id,
        })
        .select([
          'entertainer.id AS id',
          'entertainer.name AS stageName',
          'entertainer.entertainer_name AS entertainerName',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'city.name AS city',
          'country.name AS country',
          'state.name AS state',
          'entertainer.isPiqueVerified AS isPiqueVerified',
          'entertainer.bio AS bio',
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.city AS city_code',
          'entertainer.state AS state_code',
          'entertainer.country AS country_code',
          'entertainer.zipCode AS zipCode',
          'entertainer.maxTravelDistanceMiles AS maxTravelDistance',
          'entertainer.services AS services',
          'entertainer.mediaLink AS mediaLink',
          'entertainer.vaccinated AS vaccinated',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.contact_person AS contactPerson',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS contactNumber',
          'entertainer.profileStep AS profileStep',
          'entertainer.isProfileComplete AS isProfileComplete',
        ])
        .addSelect(
          `(SELECT IFNULL(CONCAT(:baseUrl, m.url), :defaultMediaUrl) FROM entertainer_media m WHERE m.user_id= entertainer.id AND m.type = 'headshot' LIMIT 1)`,
          'headshotUrl',
        )
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .getRawOne();

      //  Getting Raw Categories
      const rawCategories = await this.entCatRepository
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id') // Category relation
        .where('ecs.entertainerId = :entertainerId', {
          entertainerId: entertainerData.id,
        })
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
      const subcategories = await this.categoryRepository.find({
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

      const { socialLinks, services, id, isPiqueVerified, ...rest } =
        entertainer;

      const payload = {
        id: Number(id),
        services: services ? services.split(',') : [],
        isPiqueVerified: isPiqueVerified === 1 ? true : false,
        ...rest,
        socialLinks: socialLinks ? JSON.parse(socialLinks) : socialLinks,
        categories: formatted,
      };
      return {
        message: 'Entertainer Fetched Successfully',
        data: payload,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async findOne(id: number, userId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
      select: [
        'id',
        'name',
        'category',
        'specific_category',
        'bio',
        'performanceRole',

        'pricePerEvent',
        'vaccinated',

        'status',
        'socialLinks',
      ],
    });
    if (!entertainer) {
      throw new NotFoundException({
        message: 'Entertainer not found',
        status: false,
      });
    }
    return {
      message: 'Entertainer fetched Successfully',
      entertainer,
      status: true,
    };
  }

  // Update Entertainer
  async update(
    dto: UpdateEntertainerDto,
    userId: number,
    uploadedFiles: UploadedFile[],
  ) {
    const { contactNumber, contactPerson, ...rest } = dto;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!existingEntertainer) {
      throw new BadRequestException({
        message: 'Entertainer not Found',
        status: false,
      });
    }

    const updatePayload: any = {
      ...rest,
    };

    if (contactNumber !== undefined) {
      updatePayload.contact_number = contactNumber;
    }

    if (contactPerson !== undefined) {
      updatePayload.contact_person = contactPerson;
    }

    try {
      // Step 1: Update entertainer
      await queryRunner.manager.update(
        this.entertainerRepository.target,
        { user: { id: userId } },
        updatePayload,
      );

      // Step 2: If media is present, upload it — or else skip
      if (uploadedFiles && uploadedFiles.length > 0) {
        const mediaUploadResult = await this.mediaService.handleMediaUpload(
          userId,
          uploadedFiles,
          { eventId: null },
        );

        // You can add validation here to check if upload failed, if needed
      }

      // Step 3: Commit transaction
      await queryRunner.commitTransaction();

      return {
        message: 'Entertainer updated successfully',
        status: true,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async updateEntertainerBasicDetails(
    userId: number,
    refId: number,
    dto: GeneralInformationDto,
    uploadedFiles: UploadedFile[],
  ) {
    const {
      contactPerson,
      contactNumber,
      stageName,
      category,
      specific_category,
      ...rest
    } = dto;
    const updatedPayload = { ...rest };
    if (stageName) updatedPayload['name'] = stageName;
    if (contactNumber) updatedPayload['contact_number'] = contactNumber;
    if (contactPerson) updatedPayload['contact_person'] = contactPerson;

    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!entertainer) throw new NotFoundException('Entertainer not found');

      // Updation logic

      await this.entCatRepository.delete({ entertainerId: entertainer.id });

      // Create new empty records (subcategoryIds will be added in step 7)
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
          { entertainerId: entertainer.id, category: { id: item.categoryId } },
          { subcategoryIds: item.subcategoryIds },
        );
      }

      await this.entertainerRepository.update(
        { id: Number(entertainer.id) },
        updatedPayload,
      );

      // also remove entertainer card if category don't exists

      if (uploadedFiles && uploadedFiles.length > 0) {
        const mediaUploadResult =
          await this.mediaService.handleEntertainerMediaUpload(
            refId,
            uploadedFiles,
            { eventId: null },
          );
      }

      return { message: 'General Info updated Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException)
        throw new InternalServerErrorException(error.message);
    }
  }

  async updateEntertainerAddress(userId: number, dto: AddressDto) {
    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      const city = await this.cityRepository.findOne({
        where: { id: dto.city },
        select: ['name'],
      });
      const state = await this.stateRepository.findOne({
        where: { id: dto.state },
        select: ['name'],
      });

      const fullAddress = `${dto.addressLine1 ?? ''}, ${dto.addressLine2 ?? ''}, ${city?.name ?? ''}, ${state?.name ?? ''} ${dto.zipCode}`;

      const { lat, lng } = await this.geoService.geocodeAddress(fullAddress);
      const timezone = getTimezoneByLatLng(lat, lng);

      const newPayload = { ...dto, latitude: lat, longitude: lng, timezone };

      if (!entertainer) throw new NotFoundException('Entertainer not found');
      await this.entertainerRepository.update(
        { id: entertainer.id },
        newPayload,
      );
      return { message: 'Address updated Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateEntertainerSocialLinks(userId: number, dto: socialLinksDto) {
    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!entertainer) throw new NotFoundException('Entertainer not found');
      await this.entertainerRepository.update({ id: entertainer.id }, dto);
      return { message: 'Social Links updated Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
  async updateMediaLink(userId: number, mediaLink: string[]) {
    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!entertainer) throw new NotFoundException('Entertainer not found');
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { mediaLink },
      );
      return { message: 'Media Link updated Successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number, userId: number) {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
    });
    await this.entertainerRepository.remove(entertainer);
    return { message: 'Entertainer removed Sucessfully', status: true };
  }

  async findAllBooking(userId: number, query: BookingQueryDto) {
    const { page = 1, pageSize = 10, search = '', status = '' } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    try {
      const bookings = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Manual join since there's no
        .leftJoin('event', 'event', 'event.id = booking.eventId') // Manual join since there's no
        .leftJoin('cities', 'city', 'city.id = venue.city') // Manual join since there's no
        .leftJoin('states', 'state', 'state.id = venue.state') // Manual join since there's no
        .leftJoin('countries', 'country', 'country.id = venue.country') // Manual join since
        .where('booking.entId = :userId', { userId })

        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showStartDateTime AS showStartDateTime',
          'booking.specialNotes  As specialNotes',
          'event.id AS event_id',
          'event.title AS event_title',
          'event.description AS event_description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.slug AS event_slug',
          'venue.name AS name',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
          'city.name AS city_name',
          'country.name AS country_name',
          'state.name AS state_name',
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
          'venue.timezone AS venueTimeZone',
        ])
        .orderBy('booking.createdAt', 'DESC'); // Corrected sorting

      if (search && search.trim()) {
        bookings.andWhere(
          'LOWER(event.title) LIKE :search OR  LOWER(venue.name) LIKE :search',
          {
            search: `%${search.toLowerCase()}%`,
          },
        );
      }

      if (status) {
        bookings.andWhere('booking.status = :status', { status });
      }

      const totalCount = await bookings.getCount();

      const results = await bookings
        .orderBy('id', 'DESC')
        .skip(Number(skip))
        .take(Number(pageSize))
        .getRawMany();

      return {
        message: 'Booking fetched  Suceessfully',
        bookings: results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }

  async bookingDetailsBasedonEvent(eventId: number, userId: number) {
    try {
      const booking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // Manual join since there's no
        .leftJoin('event', 'event', 'event.id = booking.eventId') // Manual join since there's no
        .leftJoin('cities', 'city', 'city.id = venue.city') // Manual join since there's no
        .leftJoin('states', 'state', 'state.id = venue.state') // Manual join since there's no
        .leftJoin('countries', 'country', 'country.id = venue.country') // Manual join since

        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showStartDateTime AS showStartDateTime',
          'booking.specialNotes  As specialNotes',
          'booking.performanceRole AS performanceRole',

          'event.id AS event_id',
          'event.title AS event_title',

          'event.description AS event_description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.slug AS event_slug',
          'venue.name AS name',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
          'city.name AS city_name',
          'country.name AS country_name',
          'state.name AS state_name',
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
        ])
        .where('booking.entId = :userId', { userId })
        .andWhere('booking.eventId =:eventId', { eventId })
        .getRawOne();
      return {
        message: 'Booking Details returned successfully',
        data: booking,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findPendingBookings(userId: number) {
    try {
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('countries', 'country', 'country.id = venue.country')
        .where('booking.entId = :userId', { userId })
        .andWhere('booking.status IN (:...status)', {
          status: ['invited', 'applied'],
        })
        .select([
          'booking.id AS id',
          'booking.status AS status',
          'booking.showStartDateTime AS showStartDateTime',
          'booking.specialNotes AS specialNotes',
          'venue.name AS name',
          'event.id AS event_id',
          'event.title AS event_title',
          'event.description AS event_description',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.slug AS event_slug',
          'venue.description AS description',
          'venue.state AS state',
          'venue.city AS city',
          'venue.addressLine1 As addressLine1',
          'venue.addressLine2 As addressLine2',
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
          'venue.timezone AS venueTimeZone',
          'city.name AS city_name',
          'country.name AS country_name',
          'state.name AS state_name',
        ])
        .orderBy('booking.createdAt', 'DESC')
        .getRawMany();

      return {
        message: 'Pending bookings fetched successfully',
        data: bookings,
        count: bookings.length,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }

  async getCategories() {
    const categories = await this.categoryRepository.find({
      where: { parentId: 0 },
      select: ['id', 'name', 'iconUrl'],
    });

    const baseUrl = this.config.get<string>('BASE_URL');

    const data = categories.map(({ iconUrl, ...rest }) => ({
      ...rest,
      activeIcon: `${baseUrl}${iconUrl}`,
      inactiveIcon: `${baseUrl}${iconUrl.replace(/(\.\w+)$/, '_grey$1')}`,
    }));
    return {
      message: 'categories returned successfully',
      categories: data,
      status: true,
    };
  }
  async getSubCategories(catId: number[]) {
    const categories = await this.categoryRepository.find({
      where: { parentId: In(catId) },
      select: ['id', 'name', 'iconUrl', 'parentId'],
    });
    if (categories.length === 0) {
      return { message: 'Sub-categories not found', categories: null };
    }
    const baseUrl = this.config.get<string>('BASE_URL');
    const data = categories.map(({ iconUrl, ...rest }) => ({
      ...rest,
      activeIcon: `${baseUrl}${iconUrl}`,
      inactiveIcon: `${baseUrl}${iconUrl?.replace(/(\.\w+)$/, '_grey$1')}`,
    }));

    return {
      message: ' Sub-categories returned Successfully ',
      categories: data,
      status: true,
    };
  }

  async getEventDetails(userId: number) {
    const URL = `https://digidemo.in/api/uploads/2025/031741334326736-839589383.png`;

    const events = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('media', 'media', 'media.eventId = booking.eventId')
      .where('booking.entId = :userId', { userId })
      .andWhere('booking.status = :status', { status: 'confirmed' })
      .select([
        'booking.id AS bookingId',
        'event.id AS id',
        'event.title AS title',
        'event.status AS status',
        'event.description AS description',
        'event.startTime AS startTime',
        'event.endTime AS endTime',
        'event.eventDate AS eventDate',
        'event.slug AS slug',
        'event.status AS status',
        'event.recurring AS recurring',
        `COALESCE(CONCAT(:baseUrl, media.url), :defaultMediaUrl) AS image_url`,
      ])
      .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
      .setParameter('defaultMediaUrl', URL)
      .getRawMany();

    return {
      message: 'Events returned Successfully',
      data: events,
      status: true,
    };
  }

  async getDashboardStatistics(userId: number, query: DashboardDto) {
    const { year = null, month = null } = query;
    try {
      const currentDate = new Date();

      const currentYear = year ?? currentDate.getFullYear();
      const currentMonth = month ?? currentDate.getMonth();

      // Date Ranges for Current & Previous Month
      const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const prevStartDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0);
      const prevEndDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // Revenue Calculation Here
      const revenueData = await this.entInvoiceRepository
        .createQueryBuilder('invoice')
        .select([
          'SUM(CASE WHEN invoice.payment_date BETWEEN :startDate AND :endDate THEN invoice.total_with_tax ELSE 0 END) AS currentRevenue',
          'SUM(CASE WHEN invoice.payment_date BETWEEN :prevStartDate AND :prevEndDate THEN invoice.total_with_tax ELSE 0 END) AS previousRevenue',
        ])
        .where('invoice.user_id = :userId', { userId })
        .andWhere('invoice.status = :paid', { paid: 'paid' })
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawOne();

      const currentTotalRevenue = Number(revenueData.currentRevenue) || 0;
      const previousTotalRevenue = Number(revenueData.previousRevenue) || 0;

      // Fetch Booking Stats (By Status & Total Count)
      const bookingData = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect(
          `COUNT(CASE WHEN booking.createdAt BETWEEN :startDate AND :endDate THEN booking.id ELSE NULL END)`,
          'currentCount',
        )
        .addSelect(
          `COUNT(CASE WHEN booking.createdAt BETWEEN :prevStartDate AND :prevEndDate THEN booking.id ELSE NULL END)`,
          'previousCount',
        )
        .where('booking.entId = :userId', { userId })
        .groupBy('booking.status')
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawMany();

      // Fetch Total Bookings
      const totalBookingsData = await this.bookingRepository
        .createQueryBuilder('booking')
        .select([
          `COUNT(CASE WHEN booking.createdAt BETWEEN :startDate AND :endDate THEN booking.id ELSE NULL END) AS currentTotalBookings`,
          `COUNT(CASE WHEN booking.createdAt BETWEEN :prevStartDate AND :prevEndDate THEN booking.id ELSE NULL END) AS previousTotalBookings`,
        ])
        .where('booking.entId = :userId', { userId })
        .setParameters({ startDate, endDate, prevStartDate, prevEndDate })
        .getRawOne();

      const currentTotalBookings =
        Number(totalBookingsData.currentTotalBookings) || 0;
      const previousTotalBookings =
        Number(totalBookingsData.previousTotalBookings) || 0;

      // Convert bookings to structured format
      const bookingStats = {
        invited: { current: 0, previous: 0 },
        confirmed: { current: 0, previous: 0 },
        applied: { current: 0, previous: 0 },
        completed: { current: 0, previous: 0 },
        closed: { current: 0, previous: 0 },
      };

      bookingData.forEach((item) => {
        const status = item.status;
        bookingStats[status] = {
          current: Number(item.currentCount) || 0,
          previous: Number(item.previousCount) || 0,
        };
      });

      // Calculate Percentage Change (Handles Edge Cases)
      function calculateChange(current: number, previous: number) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      }

      const revenueChange = calculateChange(
        currentTotalRevenue,
        previousTotalRevenue,
      );
      const totalBookingsChange = calculateChange(
        currentTotalBookings,
        previousTotalBookings,
      );
      const pendingChange = calculateChange(
        bookingStats.invited.current,
        bookingStats.invited.previous,
      );
      const confirmedChange = calculateChange(
        bookingStats.confirmed.current,
        bookingStats.confirmed.previous,
      );
      const acceptedChange = calculateChange(
        bookingStats.applied.current,
        bookingStats.applied.previous,
      );
      const completedChange = calculateChange(
        bookingStats.completed.current,
        bookingStats.completed.previous,
      );
      const closedChange = calculateChange(
        bookingStats.closed.current,
        bookingStats.closed.previous,
      );

      const res = {
        revenue: {
          currentMonthRevenue: currentTotalRevenue,
          previousMonthRevenue: previousTotalRevenue,
          revenueChangePercentage: revenueChange,
          revenueTrend:
            revenueChange > 0
              ? 'increase'
              : revenueChange < 0
                ? 'decrease'
                : 'same',
        },
        bookings: {
          total: {
            currentMonthBookings: currentTotalBookings,
            previousMonthBookings: previousTotalBookings,
            bookingChangePercentage: totalBookingsChange,
            bookingTrend:
              totalBookingsChange > 0
                ? 'increase'
                : totalBookingsChange < 0
                  ? 'decrease'
                  : 'same',
          },
          invited: {
            currentMonthBookings: bookingStats.invited.current,
            previousMonthBookings: bookingStats.invited.previous,
            bookingChangePercentage: pendingChange,
            bookingTrend:
              pendingChange > 0
                ? 'increase'
                : pendingChange < 0
                  ? 'decrease'
                  : 'same',
          },
          applied: {
            currentMonthBookings: bookingStats.applied.current,
            previousMonthBookings: bookingStats.applied.previous,
            bookingChangePercentage: acceptedChange,
            bookingTrend:
              acceptedChange > 0
                ? 'increase'
                : acceptedChange < 0
                  ? 'decrease'
                  : 'same',
          },
          confirmed: {
            currentMonthBookings: bookingStats.confirmed.current,
            previousMonthBookings: bookingStats.confirmed.previous,
            bookingChangePercentage: confirmedChange,
            bookingTrend:
              confirmedChange > 0
                ? 'increase'
                : confirmedChange < 0
                  ? 'decrease'
                  : 'same',
          },
          completed: {
            currentMonthBookings: bookingStats.completed.current,
            previousMonthBookings: bookingStats.completed.previous,
            bookingChangePercentage: completedChange,
            bookingTrend:
              completedChange > 0
                ? 'increase'
                : completedChange < 0
                  ? 'decrease'
                  : 'same',
          },
          closed: {
            currentMonthBookings: bookingStats.closed.current,
            previousMonthBookings: bookingStats.closed.previous,
            bookingChangePercentage: closedChange,
            bookingTrend:
              closedChange > 0
                ? 'increase'
                : closedChange < 0
                  ? 'decrease'
                  : 'same',
          },
        },
      };

      return {
        message: 'Entertainer Dashboard returned Successfully',
        status: true,
        data: res,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async getUpcomingEvent(userId: number, query: UpcomingEventDto) {
    const { page = 1, pageSize = 10, status = [], search = '' } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    try {
      const URL =
        'https://digidemo.in/api/uploads/2025/031741334326736-839589383.png';

      const events = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('event', 'event', 'event.id = booking.eventId') // simple join
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // simple join
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('media', 'media', 'media.eventId = event.id')
        .where('booking.entId = :userId', { userId })
        .andWhere('booking.status = :status', { status: 'confirmed' })
        .andWhere('event.status NOT IN (:...eventStatus)', {
          eventStatus: ['canceled', 'completed'],
        })
        .andWhere('DATE(booking.showStartDateTime) >= :now', {
          now: new Date(),
        })

        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.slug AS slug',
          'event.description AS description',

          // Added two new Fields...
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
          'state.name AS stateName',
          'city.name AS cityName',
          'venue.state AS stateCode',
          'venue.city AS cityCode',
          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine2 AS venue_addressLine2',
          'venue.latitude AS latitude',
          'venue.longitude AS longitude',
          `CASE WHEN media.url IS NOT NULL THEN CONCAT(:baseUrl, media.url) ELSE :defaultMediaUrl END AS image_url`,
        ])
        .setParameter('baseUrl', this.config.get<string>('BASE_URL'))
        .setParameter('defaultMediaUrl', URL)
        .orderBy('event.startTime', 'ASC');

      if (search && search.trim()) {
        events.andWhere('LOWER(event.title) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (status && status.length > 0) {
        events.andWhere('event.status IN (:...eventStatuses)', {
          eventStatuses: status,
        });
      }

      const totalCount = await events.getCount();

      const results = await events
        .skip(Number(skip))
        .take(Number(pageSize))
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
        status: true,
      });
    }
  }

  async getEventDetailsByMonth(userId: number, query: EventsByMonthDto) {
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
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId') // simple join
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .where('booking.entId = :userId', { userId })
        .andWhere('YEAR(event.eventStartDateTime) = :year', { year })
        .andWhere('MONTH(event.eventEndDateTime) = :month', { month })

        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.eventDate AS eventDate',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          //Added to new Fields...
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.status AS status',
          'event.slug AS slug',
          'event.isAdmin AS isAdmin',
          'venue.name AS venueName',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.timezone AS  venueTimeZone',
          'city.name AS cityName',
          'state.name AS stateName',
          'venue.city AS cityCode',
          'venue.state AS stateCode',
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

  async getEventDetailsById(userId: number, id: number) {
    try {
      const eventDetails = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .where('event.id = :id', { id })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.description AS description',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
          'venue.name AS name',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine2',
          'venue.timezone AS venueTimeZone',
          'venue.zipCode AS zipCode',
          'state.name AS state',
          'city.name AS city',
          'code.StateCode AS stateCode',
        ])
        .getRawOne();

      if (!eventDetails) throw new BadRequestException('Event not Found');

      return {
        message: 'Event Details returned successfully',
        status: true,
        data: eventDetails,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException({
        message: error.message,
        status: true,
      });
    }
  }
  // Setting Travel Distance

  async setTravelDistance(userId: number, distance: number) {
    try {
      const entertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });
      if (!entertainer) throw new NotFoundException('Entertainer not found');
      await this.entertainerRepository.update(
        { id: entertainer.id },
        { maxTravelDistanceMiles: distance },
      );
      return {
        message: 'Entertainer maximum travel distance set successfully ',
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTravelDistance(venueId: number) {
    try {
      const maxTravelDistance = await this.entertainerRepository.findOne({
        where: { id: venueId },
        select: ['maxTravelDistanceMiles'],
      });
      return {
        message: 'Travel distance returned Successfully',
        status: true,
        data: maxTravelDistance,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async changeStatus(bookingId: number, status, entId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, entId },
    });

    if (!booking) throw new NotFoundException('Booking Not found');

    await this.bookingRepository.update({ id: bookingId }, { status });

    return { message: 'Booking status updated Successfully', status: true };
  }

  async getCompletedEvents(id: number, month: number, year: number) {
    try {
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month, 1);

      const completedEvents = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('venue', 'venue', 'venue.id = booking.venueId')
        .where('booking.entId = :id', { id })
        .andWhere('booking.status = :bStatus', { bStatus: 'completed' })
        .andWhere('event.status = :eStatus', { eStatus: 'completed' })
        .andWhere(
          'event.eventStartDateTime >= :fromDate AND event.eventStartDateTime < :toDate',
          {
            fromDate,
            toDate,
          },
        )
        .andWhere(
          `NOT EXISTS (
      SELECT 1 FROM invoice_bookings ib
      WHERE ib.event_id = event.id
      AND ib.booking_id = booking.id
    )`,
        )
        .select([
          'event.id AS eventId',
          'booking.id AS bookingId',
          'event.slug AS slug',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'venue.name AS venueName',
          'venue.addressLine1 AS addressLine1',
          'venue.addressLine2 AS addressLine',
        ])
        .orderBy('event.eventStartDateTime', 'DESC')
        .getRawMany();

      return {
        message: `completed events fetched successfully.`,
        data: completedEvents,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getPricePerHour(userId: number) {
    try {
      const data = await this.entertainerRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.user')
        .leftJoin('states', 'state', 'state.id = entertainer.state')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .leftJoin('cities', 'city', 'city.id = entertainer.city')
        .select([
          'entertainer.pricePerEvent AS pricePerHour',
          'entertainer.entertainerName AS entertainerName',
          'entertainer.contact_number AS contactNumber',
          'user.email AS email',
          'city.name As cityName',
          'state.name AS stateName',
          'state.name AS stateName',
          'entertainer.city AS cityCode',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          'entertainer.city AS cityCode',
          'entertainer.state AS stateCode',
        ])
        .where('entertainer.id = :userId', { userId })
        .getRawMany();

      return {
        message: 'Price per hour fetched successfully',
        data,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllSubCategories() {
    try {
      const categories = await this.categoryRepository.find({
        where: { parentId: Not(0) },
        select: ['id', 'name', 'iconUrl', 'parentId'],
      });

      return {
        message: 'sub-categories returned successfully',
        data: categories,
        status: true,
      };
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
            where: { subcategoryId: rate.subcategoryId },
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
        .where('rate.entertainerId = :entertainerId', { entertainerId })
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
}
