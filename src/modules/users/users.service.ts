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
import { instanceToPlain } from 'class-transformer';
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

  // User Profile

  async handleGetUserProfile(userId: number, role: string) {
    const response = { message: 'Profile fetched Successfully', status: true };

    if (role === 'venue') {
      const details = await this.venueRepository
        .createQueryBuilder('venue')
        .leftJoinAndSelect('venue.user', 'user')
        .where('venue.user.id = :userId', { userId })
        .andWhere('venue.isParent = :isParent', { isParent: true })
        .select([
          'user.id AS uid',
          'user.name AS name',
          'user.email AS email',
          'user.phoneNumber AS phoneNumber',
          'user.role AS role',
          'venue.id AS vid',
          'venue.name AS vName',
          'venue.phone AS vPhone',
          'venue.email AS vEmail',
          'venue.addressLine1 As  vAddressLine1',
          'venue.addressLine2 As vAddressLine2',
          'venue.description AS vDescription',
          'venue.city As vCity',
          'venue.state As vState',
          'venue.zipCode AS vZipCode',
          'venue.country AS vCountry',
        ])
        .getRawOne();
      details['vIsParent'] = Boolean(details.isParent);
      const location = await this.venueRepository.find({
        where: { user: { id: userId }, isParent: false },
        select: [
          'phone',
          'addressLine1',
          'addressLine2',
          'country',
          'zipCode',
          'city',
          'state',
          'country',
          'zipCode',
        ],
      });
      const rest = instanceToPlain(location);
      details['locations'] = rest;
      response['data'] = details;
      return response;
    }
    const entDetails = await this.entertainerRepository
      .createQueryBuilder('ent')
      .leftJoinAndSelect('ent.user', 'user')
      .where('ent.user.id = :userId', { userId })
      .select([
        'user.id AS uid',
        'ent.name AS stageName',
        'user.name AS name',
        'user.email AS email',
        'user.phoneNumber AS phoneNumber',
        'user.role AS role',
        'ent.category AS category',
        'ent.bio AS bio',
        'ent.pricePerEvent AS pricePerEvent',
        'ent.availability AS availability',
        'ent.vaccinated AS vaccinated',
      ])
      .getRawOne();

    response['data'] = entDetails;
    return response;
  }

  // async handleUpdateUserProfile(
  //   updateProfileDto: UpdateProfileDto,
  //   userId: number,
  //   role: string,
  // ) {
  //   const { userData, venueData, entertainerData } = updateProfileDto;
  //   const { venueId, ...venueDetails } = venueData;

  //   const user = this.userRepository.findOne({ where: { id: userId } });

  //   if (!user) {
  //     throw new NotFoundException('User Not Found');
  //   }

  //   await this.userRepository.update({ id: userId }, userData);

  //   // Venue Role update handling.  // If venue exists.
  //   if (role == 'venue') {
  //     const existingVenue = await this.venueRepository.findOne({
  //       where: { user: { id: userId }, id: venueId },
  //     });

  //     if (!existingVenue) {
  //       // If venue do not exists.
  //       const venue = this.venueRepository.create({
  //         ...venueData,
  //         user: { id: userId },
  //       });

  //       const newVenue = await this.venueRepository.save(venue);
  //       return {
  //         message: 'Profile Updated Successfully',
  //         upDatedDetails: newVenue,
  //       };
  //     }

  //     const updatedVenue = await this.venueRepository.update(
  //       { id: existingVenue.id },
  //       venueDetails,
  //     );
  //     // return {
  //     //   message: 'Profile Updated Successfully',
  //     //   upDatedDetails: updatedVenue,
  //     // };
  //   }

  //   // Entertainer Role update handling.  // If entertainer exists.

  //   if (role == 'entertainer') {
  //     const existingEntertainer = await this.entertainerRepository.findOne({
  //       where: { user: { id: userId } },
  //     });

  //     if (!existingEntertainer) {
  //       console.log('non existing entertainer block');
  //       const entertainer = this.entertainerRepository.create({
  //         ...entertainerData,
  //         user: { id: userId },
  //       });

  //       const newEntertainer =
  //         await this.entertainerRepository.save(entertainer);
  //       return {
  //         message: 'Profile Updated Successfully',
  //         upDatedDetails: newEntertainer,
  //       };
  //     }

  //     const upDatedEntertainer = await this.entertainerRepository.update(
  //       { id: existingEntertainer.id },
  //       entertainerData,
  //     );
  //     // return {
  //     //   message: 'Profile Updated Successfully',
  //     //   upDatedDetails: upDatedEntertainer,
  //     // };
  //   }

  //   return { message: 'User Profile updated successfully' };
  // }
}
