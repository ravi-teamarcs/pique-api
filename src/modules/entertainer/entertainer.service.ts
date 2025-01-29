import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';
// import { Booking } from '../booking/entities/booking.entity';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from '../booking/entities/booking.entity';

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
  ) {}

  // create(
  //   createEntertainerDto: CreateEntertainerDto,
  //   userId: number,
  // ): Promise<Entertainer> {
  //   const entertainer = this.entertainerRepository.create({
  //     ...createEntertainerDto,
  //     user: { id: userId },
  //   });
  //   return this.entertainerRepository.save(entertainer);
  // }

  async create(
    createEntertainerDto: CreateEntertainerDto,
    userId: number,
  ): Promise<Entertainer> {
    // const user = await this.userRepository.findOneBy({ id: userId });
    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingEntertainer) {
      throw new BadRequestException('Entertainer already exists for the user');
      // throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Create the entertainer
    const entertainer = this.entertainerRepository.create({
      ...createEntertainerDto,
      user: { id: userId },
    });

    return this.entertainerRepository.save(entertainer);
  }

  findAll(userId: number): Promise<Entertainer[]> {
    return this.entertainerRepository.find({
      where: { user: { id: userId } },
      select: [
        'id',
        'name',
        'type',
        'bio',

        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',

        'vaccinated',
        'availability',
        'status',
        'socialLinks',
      ],
      // relations: ['user'],
    });
  }

  async findOne(id: number, userId: number): Promise<Entertainer> {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
      select: [
        'id',
        'name',
        'type',
        'bio',
        'performanceRole',
        'phone1',
        'phone2',
        'pricePerEvent',
        'vaccinated',
        'availability',
        'status',
        'socialLinks',
      ],
      // relations: ['user'],
    });
    if (!entertainer) {
      throw new NotFoundException('Entertainer not found');
    }
    return entertainer;
  }

  async update(
    id: number,
    updateEntertainerDto: UpdateEntertainerDto,
    userId: number,
  ): Promise<Entertainer> {
    const entertainer = await this.findOne(id, userId);
    Object.assign(entertainer, updateEntertainerDto);
    return this.entertainerRepository.save(entertainer);
  }

  async remove(id: number, userId: number): Promise<void> {
    const entertainer = await this.findOne(id, userId);
    await this.entertainerRepository.remove(entertainer);
  }
  async findAllBooking(userId: number): Promise<Booking[]> {
    // Find entertainers belonging to the specified user
    try {
      //     const entertainers = await this.entertainerRepository.find({
      //       where: { user: { id: userId } },
      //     });

      // Extract entertainer IDs
      // const entertainerIds = entertainers.map((entertainer) => entertainer.id);

      // Find bookings for these entertainers
      // const bookings = await this.bookingRepository.find({
      //   where: { entertainer: { id: In(entertainerIds) } },
      //   select: [
      //     'id',
      //     'status',
      //     'showTime',
      //     'isAccepted',
      //     'showDate',
      //     'specialNotes',
      //     'specificLocation',
      //   ],
      //   relations: ['venue'],
      // });
      // const bookings = await this.bookingRepository.find({
      //   where: { entertainerUser: { id: userId } },
      //   select: [
      //     'id',
      //     'status',
      //     'showTime',
      //     'isAccepted',
      //     'showDate',
      //     'specialNotes',
      //   ],
      // });
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.venueUser', 'venueUser')
        .leftJoinAndSelect('venueUser.venue', 'venue')
        .where('booking.entertainerUserId = :userId', { userId })
        .select([
          'booking.id',
          'booking.status',
          'booking.showDate',
          'booking.showTime',
          'booking.specialNotes',
          'venueUser.id',
          'venue.name',
          'venue.phone',
          'venue.amenities',
          'venue.email',
          'venue.description',
          'venue.state',
          'venue.city',
        ])
        .getMany();

      return bookings;
    } catch (error) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}

// "name": "JW Marriot",
//                 "phone": "9876543210",
//                 "email": "J@mariott.com",
//                 "addressLine1": "s,lasda",
//                 "addressLine2": "sdmlddmdm,",
//                 "description": "hotel w",
//                 "city": "noida",
//                 "state": "UP",
//                 "zipCode": "123",
//                 "country": "India",
//                 "lat": "12",
//                 "long": "63",
//                 "amenities": [],
