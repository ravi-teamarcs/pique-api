import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Venue } from '../venue/entities/venue.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
//import * as bcrypt from 'bcryptjs';

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

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new HttpException('Email already in use', HttpStatus.CONFLICT);
    }

    const newUser = this.userRepository.create(createUserDto);
    return this.userRepository.save(newUser);
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Update user by ID
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    const user = await this.findById(id);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const updatedUser = Object.assign(user, updateUserDto);
    return this.userRepository.save(updatedUser);
  }

  /**
   * Delete user by ID
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.userRepository.delete(id);

    if (result.affected === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return true;
  }

  async handleUpdateUserProfile(
    updateProfileDto: UpdateProfileDto,
    userId: number,
    role: string,
  ) {
    const { userData, venueData, entertainerData } = updateProfileDto;
    const user = this.userRepository.findOne({ where: { id: userId } });

    console.log(userId);

    if (!user) {
      throw new NotFoundException('User Not Found');
    }

    await this.userRepository.update({ id: userId }, userData);

    // Venue Role update handling.  // If venue exists.
    if (role == 'venue') {
      const existingVenue = await this.venueRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!existingVenue) {
        // If venue do not exists.
        const venue = this.venueRepository.create({
          ...venueData,
          user: { id: userId },
        });

        const newVenue = await this.venueRepository.save(venue);
        return {
          message: 'Profile Updated Successfully',
          upDatedDetails: newVenue,
        };
      }

      const updatedVenue = await this.venueRepository.update(
        { id: existingVenue.id },
        venueData,
      );
      // return {
      //   message: 'Profile Updated Successfully',
      //   upDatedDetails: updatedVenue,
      // };
    }

    // Entertainer Role update handling.  // If entertainer exists.

    if (role == 'entertainer') {
      const existingEntertainer = await this.entertainerRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!existingEntertainer) {
        console.log('non existing entertainer block');
        const entertainer = this.entertainerRepository.create({
          ...entertainerData,
          user: { id: userId },
        });

        const newEntertainer =
          await this.entertainerRepository.save(entertainer);
        return {
          message: 'Profile Updated Successfully',
          upDatedDetails: newEntertainer,
        };
      }

      const upDatedEntertainer = await this.entertainerRepository.update(
        { id: existingEntertainer.id },
        entertainerData,
      );
      // return {
      //   message: 'Profile Updated Successfully',
      //   upDatedDetails: upDatedEntertainer,
      // };
    }

    return { message: 'User Profile updated successfully' };
  }
}
