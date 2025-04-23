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

    if (!['venue', 'entertainer'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    const newRole = role === 'entertainer' ? 'entertainers' : role;
    const alias = role; // dynamic table alias
    const res = this.userRepository
      .createQueryBuilder('user')
      .leftJoin(newRole, alias, `${alias}.userId = user.id`)
      .select([
        `${alias}.*`, // select all fields from venue/entertainer
        'user.id AS user_id',
        'user.email AS user_email',
        'user.status AS user_status',
        'user.isVerified AS user_is_verified',
      ])
      .where(
        'user.createdByAdmin = false AND user.role = :role AND user.status = :status',
        { role, status: 'pending' },
      );

    const totalCount = await res.getCount();
    const results = await res
      .orderBy(`${alias}.name`, 'DESC')
      .skip(skip)
      .take(Number(pageSize))
      .getRawMany();

    return {
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} approval list fetched successfully`,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      data: results,
      status: true,
    };
  }
}
