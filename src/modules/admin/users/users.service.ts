import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateUserDto } from './Dto/update-user.dto';
import { CreateUserDto } from './Dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { ApprovalQuery } from './Dto/query.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
  ) {}

  async getAllUser({
    page,
    pageSize,
    search,
    role,
  }: {
    page: number;
    pageSize: number;
    search?: string;
    role?: string;
  }) {
    const skip = (page - 1) * pageSize; // Calculate records to skip

    // Unnecessary condition  all user must be fetched irrespective of their status.
    const whereCondition: any = {
      // status: Not('inactive'), // Ensure only active users are fetched
    };

    if (search.trim()) {
      whereCondition.name = Like(`%${search}%`);
    }

    if (role.trim()) {
      whereCondition.role = role;
    }

    const [records, total] = await this.userRepository.findAndCount({
      where: whereCondition,
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return {
      records,
      total,
      page,
      pageSize,
    };
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new HttpException(
        {
          message: 'Email Already in Use',
          error: 'Bad Request',
          status: false,
        },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      status: 'active',
      isVerified: true,
      createdByAdmin: true,
    });

    return this.userRepository.save(newUser);
  }

  async remove(id: number) {
    // Validate the provided IDs: Check if all IDs exist in the database
    const user = await this.userRepository.findOne({
      where: { id },
    });

    // If no users found, throw an error
    if (!user) {
      throw new NotFoundException({ message: 'User not Found', status: true });
    }
    try {
      await this.userRepository.remove(user);

      return { message: 'User removed Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  async updateUser(updateUserDto: UpdateUserDto): Promise<string> {
    const { id, fieldsToUpdate } = updateUserDto;

    // Check if password needs to be updated
    if (fieldsToUpdate.password) {
      fieldsToUpdate.password = await bcrypt.hash(fieldsToUpdate.password, 10);
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.userRepository.update(id, fieldsToUpdate);

    return `User with ID ${id} updated successfully.`;
  }

  // update single user status
  // async updateUserStatus(dto: UpdateStatusDto) {
  //   const { userId, status } = dto;

  //   const user = await this.userRepository.findOne({ where: { id: userId } });
  //   if (!user) {
  //     throw new NotFoundException({
  //       message: `User with ID ${userId} not found.`,
  //       status: false,
  //     });
  //   }

  //   try {
  //     await this.userRepository.update({ id: userId }, { status });

  //     return { message: 'User status Updated', status: true };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: 'Error in updating user status',
  //       error: error.message,
  //       status: false,
  //     });
  //   }
  // }
  // Multiple user  status change
  async updateStatus(updateStatusDto: UpdateStatusDto): Promise<string> {
    let { ids, status } = updateStatusDto;

    // Validate the provided IDs: Check if all IDs exist in the database
    const usersToUpdate = await this.userRepository.find({
      where: { id: In(ids) },
    });

    // If no users found, throw an error
    if (usersToUpdate.length === 0) {
      throw new Error('No valid users found with the provided IDs.');
    }

    // Ensure all IDs are unique and in the database (check for missing ones)
    const invalidIds = ids.filter(
      (id) => !usersToUpdate.some((user) => user.id === id),
    );
    if (invalidIds.length > 0) {
      throw new Error(`Invalid user IDs: ${invalidIds.join(', ')}`);
    }
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status value');
    }
    // Perform the status update using a transaction for atomic operation
    try {
      const result = await this.userRepository.update(
        { id: In(ids) },
        { status: status },
      );

      // If no users were updated, throw an error
      if (result.affected === 0) {
        throw new Error('No users found with the given IDs');
      }

      return `${result.affected} users updated to ${status}`;
    } catch (error) {
      throw new Error(`Failed to update users: ${error.message}`);
    }
  }

  async getApprovalList(query: ApprovalQuery) {
    const { page = 1, pageSize = 10, role } = query;
    const skip = (Number(page) - 1) * Number(pageSize);

    if (role === 'venue') {
      const res = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('venue', 'venue', 'venue.userId = user.id') // Join the 'venue' table
        .leftJoin('cities', 'city', 'city.id = venue.city') // Join 'cities' table based on 'venue.city'
        .leftJoin('states', 'state', 'state.id = venue.state') // Join 'states' table based on 'venue.state'
        .leftJoin('countries', 'country', 'country.id = venue.country') // Join 'countries' table based on 'venue.country'
        .leftJoin(
          (qb) =>
            qb
              .select([
                'neighbourhood.venueId AS nh_venue_id', // Selecting 'venueId' from 'neighbourhood' as 'nh_venue_id'
                `JSON_ARRAYAGG(
            JSON_OBJECT(
              "id", neighbourhood.id,
              "name", neighbourhood.name,
              "contactPerson", neighbourhood.contact_person,
              "contactNumber", neighbourhood.contact_number
            )
          ) AS neighbourhoodDetails`, // Aggregate neighbourhoods into JSON array
              ])
              .from('neighbourhood', 'neighbourhood') // From 'neighbourhood' table
              .groupBy('neighbourhood.venueId'), // Group by 'venueId' to match venues with neighbourhoods
          'neighbourhoods', // Alias for the subquery
          'neighbourhoods.nh_venue_id = venue.id', // Join condition for neighbourhoods based on venue id
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
          'COALESCE(neighbourhoods.neighbourhoodDetails, "[]") AS neighbourhoods', // Handle empty neighbourhoods array with COALESCE
        ])
        .orderBy('user.id', 'DESC') // Sort by user ID
        .where(
          'user.createdByAdmin = false AND user.role = :role AND user.status = :status',
          { role, status: 'pending' }, // Filter by user role and status
        );

      const totalCount = await res.getCount();
      const results = await res
        .orderBy(`user.id`, 'DESC')
        .skip(skip)
        .take(Number(pageSize))
        .getRawMany();
      const parsedResult = results.map(({ neighbourhoods, ...rest }) => ({
        ...rest,
        neighbourhoods: JSON.parse(neighbourhoods),
      }));

      return {
        message: `Venue approval list fetched successfully`,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        data: parsedResult,
        status: true,
      };
    } else {
      const res = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('entertainers', 'ent', `ent.userId = user.id`)
        .leftJoin('cities', 'city', `city.id = ent.city`)
        .leftJoin('states', 'state', `state.id = ent.state`)
        .leftJoin('countries', 'country', `country.id = ent.country`)

        .select([
          `ent.*`, // select all fields from venue/entertainer
          'user.id AS user_id',
          'user.email AS user_email',
          'user.status AS user_status',
          'user.isVerified AS user_is_verified',
          'city.name As city_name',
          'country.name As country_name',
          'state.name As state_name',
        ])
        .where(
          'user.createdByAdmin = false AND user.role = :role AND user.status = :status',
          { role, status: 'pending' },
        );

      const totalCount = await res.getCount();
      const results = await res
        .orderBy(`user.id`, 'DESC')
        .skip(skip)
        .take(Number(pageSize))
        .getRawMany();

      return {
        message: `Entertainer approval list fetched successfully`,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / Number(pageSize)),
        data: results,
        status: true,
      };
    }
  }
}
