import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { Entertainer } from './entities/entertainer.entity';
import { User } from '../users/entities/users.entity';

@Injectable()
export class EntertainerService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
  ): Promise<Entertainer> {
    const { userId, ...entertainerData } = createEntertainerDto;
    const user = await this.userRepository.findOneBy({ id: userId });
    console.log(userId, user);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Create the entertainer
    const entertainer = this.entertainerRepository.create({
      ...entertainerData,
      user,
    });

    return this.entertainerRepository.save(entertainer);
  }

  findAll(userId: number): Promise<Entertainer[]> {
    return this.entertainerRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findOne(id: number, userId: number): Promise<Entertainer> {
    const entertainer = await this.entertainerRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['user'],
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
}
