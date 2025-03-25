import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository } from 'typeorm';
import { User } from './Entity/users.entity';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateUserDto } from './Dto/update-user.dto';
import { CreateUserDto } from './Dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    const whereCondition: any = {
      status: Not('inactive'), // Ensure only active users are fetched
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
    const newUser = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
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

  async updateUserStatus(dto: UpdateStatusDto) {
    const { userId, status } = dto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        message: `User with ID ${userId} not found.`,
        status: false,
      });
    }

    try {
      await this.userRepository.update({ id: userId }, { status });

      return { message: 'User status Updated', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error in updating user status',
        error: error.message,
        status: false,
      });
    }
  }
}
