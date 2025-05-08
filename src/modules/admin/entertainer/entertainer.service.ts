import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entertainer } from './entities/entertainer.entity';
import { DataSource, In, Like, Not, Repository } from 'typeorm';
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
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly emailService: EmailService,
  ) {}

  async getAllEntertainers(query: GetEntertainerDto) {
    const { page = 1, pageSize = 10, search = '', vaccinated, date } = query; // Default values for pagination
    const skip = (page - 1) * pageSize; // Calculate records to skip

    const baseQuery = this.entertainerRepository
      .createQueryBuilder('entertainer')
      .leftJoin('countries', 'country', 'country.id = entertainer.country')
      .leftJoin('states', 'state', 'state.id = entertainer.state')
      .leftJoin('cities', 'city', 'city.id = entertainer.city')
      .leftJoin('categories', 'cat', 'cat.id = entertainer.category')
      .leftJoin(
        'categories',
        'subcat',
        'subcat.id = entertainer.specific_category',
      )
      .where('entertainer.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .select([
        'entertainer.id AS id',
        'entertainer.name AS name',
        'entertainer.entertainer_name AS entertainer_name',
        'entertainer.dob AS dob',
        'entertainer.bio AS bio',
        'entertainer.performanceRole AS performanceRole',
        'entertainer.socialLinks AS socialLinks',
        'entertainer.zipCode AS ZipCode',
        "COALESCE(entertainer.services, '') AS services",
        'entertainer.contact_person AS contactPerson',
        'entertainer.contact_number AS ContactNumber',
        'entertainer.address AS address',
        'entertainer.status AS status',
        'entertainer.vaccinated AS vaccinated',
        'city.name AS city',
        'country.name AS country',
        'state.name AS state',
      ]);

    if (search) {
      baseQuery.where('entertainer.name LIKE :search', {
        search: `%${search}%`,
      });
    }
    if (vaccinated) {
      baseQuery.andWhere('entertainer.vaccinated = :vaccinated', {
        vaccinated,
      });
    }

    if (date) {
      baseQuery.andWhere(
        (qb) => {
          return `NOT EXISTS (
            SELECT 1 FROM booking b
            WHERE b.entId = entertainer.id AND b.showDate = :blockedDate
          )`;
        },
        { blockedDate: date },
      );
    }

    // Clone for count
    const total = await baseQuery.getCount();

    // Add selects for main query
    const records = await baseQuery
      .orderBy('entertainer.name', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getRawMany();

    const parsedRecords = records.map(({ services, id, ...rest }) => ({
      // services: services ? services.split(',') : [],
      id: Number(id),
      ...rest,
    }));

    return {
      message: 'Entertainers fetched Sucessfully.',
      records: parsedRecords,
      total,
      pageSize,
      currentPage: page, // Total count of entertainers
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
        .leftJoin('categories', 'cat', 'cat.id = entertainer.category')
        .leftJoin(
          'categories',
          'subcat',
          'subcat.id = entertainer.specific_category',
        )
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
              .from('media', 'media')
              .groupBy('media.user_id'),
          'media',
          'media.media_user_id = entertainer.id',
        )
        .select([
          'entertainer.id AS id',
          'entertainer.name AS name',
          'entertainer.entertainer_name AS entertainer_name',
          'entertainer.dob AS dob',
          'entertainer.city AS cityCode',
          'entertainer.state AS stateCode',
          'entertainer.country AS countryCode',
          'entertainer.bio AS bio',
          'entertainer.addressLine1 AS addressLine1',
          'entertainer.addressLine2 AS addressLine2',
          `entertainer.address AS address`,
          'entertainer.pricePerEvent AS pricePerEvent',
          'entertainer.category AS category',
          'entertainer.specific_category AS specific_category',
          'cat.name AS categoryName',
          'subcat.name AS specificCategoryName',
          'entertainer.performanceRole AS performanceRole',
          'entertainer.socialLinks AS socialLinks',
          'entertainer.zipCode AS ZipCode',
          "COALESCE(entertainer.services, '') AS services",
          'entertainer.contact_person AS contactPerson',
          'entertainer.contact_number AS ContactNumber',
          'entertainer.address AS address',
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

      if (res.createdByAdmin === 1) {
        const data = await this.tempRepository.findOne({
          where: { email: res.email },
        });
        res['password'] = data?.password;
      }
      return {
        message: 'Entertainer Details fetched Successfully',
        records: {
          ...res,
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
    const { contactPerson, contactNumber, stageName, ...restDetails } =
      entertainer;
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

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleMediaUpload(
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
      await this.entertainerRepository.update({ id: entertainer.id }, dto);
      return {
        message: 'Address updated Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async uploadMedia(id: number, uploadedFiles: UploadedFile[]) {
    try {
      await this.mediaService.handleMediaUpload(id, uploadedFiles);

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
    const { contactPerson, contactNumber, stageName, ...restDetails } =
      entertainer;

    // Remove any undefined properties

    try {
      const entertainer = await queryRunner.manager.findOne(Entertainer, {
        where: { id: entertainerId },
        relations: ['user'],
      });

      if (!entertainer) {
        throw new NotFoundException({
          message: 'Entertainer Not Found',
          status: false,
        });
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
                  'Email Already taken by another user , cannot update email. ',
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
            throw new BadRequestException({ message: 'Email Already in Use' });

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

      await queryRunner.manager.update(
        Entertainer,
        { id: entertainer.id },
        payload,
      );

      if (uploadedFiles?.length > 0) {
        await this.mediaService.handleMediaUpload(
          entertainer.id,
          uploadedFiles,
        );
      }
      await queryRunner.commitTransaction();
      return {
        message: 'Entertainer updated   with media Sucessfully ',
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
    const categories = this.CategoryRepository.find({
      where: { parentId: 0 },
    });

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

      if (entertainer.user) {
        await this.userRepository.update(
          { id: entertainer.user.id },
          { status },
        );
      }
      await this.entertainerRepository.update({ id }, { status });
      const currentYear = new Date().getFullYear();
      // Send Email to the User
      const emailPayload = {
        to: entertainer.user.email,
        subject: 'Account Status',
        templateName:
          status === 'active'
            ? 'account-approved.html'
            : 'account-rejected.html',
        replacements: { name: entertainer.user.name, year: currentYear },
      };

      this.emailService.handleSendEmail(emailPayload);
      return {
        message: 'Entertainer Status updated Successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async getSubCategory(parentId: number) {
    const res = await this.CategoryRepository.find({
      where: { parentId },
    });

    return res;
  }
  async categorybyId(id: number) {
    try {
      // Find the category by its ID
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
        .andWhere('YEAR(event.eventDate) = :year', { year })
        .andWhere('MONTH(event.eventDate) = :month', { month })
        .select([
          'event.id AS event_id',
          'event.title AS title',
          'event.location AS location',
          'event.eventDate AS eventDate',
          'event.description AS description',
          'event.startTime AS startTime',
          'event.endTime AS endTime',
          'event.recurring AS recurring',
          'event.status AS status',
          'event.isAdmin AS isAdmin',
        ])
        .orderBy('event.eventDate', 'ASC');

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
}
