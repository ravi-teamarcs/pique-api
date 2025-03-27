import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entertainer } from './entities/entertainer.entity';
import { In, Like, Not, Repository } from 'typeorm';
import { Categories } from './entities/Category.entity';
import { CreateCategoryDto } from './Dto/create-category.dto';
import { UpdateCategoryDto } from './Dto/update-category.dto';
import { CreateEntertainerDto } from './Dto/create-entertainer.dto';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateEntertainerDto } from './Dto/update-entertainer.dto';
import slugify from 'slugify';

@Injectable()
export class EntertainerService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(Categories)
    private readonly CategoryRepository: Repository<Categories>,
  ) {}
  async getAllEntertainers({
    page,
    pageSize,
    search,
  }: {
    page: number;
    pageSize: number;
    search: string;
  }): Promise<{ records: Entertainer[]; total: number }> {
    const skip = (page - 1) * pageSize; // Calculate records to skip

    const [records, total] = await this.entertainerRepository.findAndCount({
      where: {
        ...(search ? { name: Like(`%${search}%`) } : {}), // Filter by name if search is provided
        status: In(['active', 'available']),
      },
      relations: ['user'], // Include the related `User` entity
      skip, // Pagination: records to skip
      take: pageSize,
      order: { id: 'DESC' },
    });

    return {
      records, // Paginated entertainers
      total, // Total count of entertainers
    };
  }

  async getEntertainerByUserId(userId) {
    const records = await this.entertainerRepository.find({
      where: {
        user: { id: userId },
      },
    });

    return {
      records,
      total: records.length,
    };
  }

  async create(createEntertainerDto: CreateEntertainerDto): Promise<any> {
    const { userId, ...entertainerData } = createEntertainerDto;

    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingEntertainer) {
      throw new BadRequestException('Entertainer already exists for the user');
    }
    // Create the entertainer
    const entertainer = this.entertainerRepository.create({
      ...entertainerData,
      user: { id: userId },
    });

    return this.entertainerRepository.save(entertainer);
  }

  async update(updateEntertainerDto: UpdateEntertainerDto): Promise<any> {
    const { id, fieldsToUpdate } = updateEntertainerDto;

    const existingEntertainer = await this.entertainerRepository.findOne({
      where: { user: { id } }, // Use nested object for relations
      relations: ['user'], // Ensure the relation is loaded
    });

    if (!existingEntertainer) {
      throw new BadRequestException('Entertainer not found');
    }

    // Update only the fields provided
    await this.entertainerRepository.update(
      existingEntertainer.id,
      fieldsToUpdate,
    );

    return this.entertainerRepository.findOne({
      where: { id: existingEntertainer.id },
    });
  }

  async getMainCategory() {
    const categories = this.CategoryRepository.find({
      where: { parentId: 0 },
    });

    return categories;
  }

  async getSubCategory(parentId: number) {
    const res = await this.CategoryRepository.find({
      where: { parentId },
    });

    return res;
  }
  async categorybyId(id: number) {
    try {
      console.log(id);
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
    const user = await this.entertainerRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'Entertainer Not Found',
        status: false,
      });
    }

    try {
      await this.entertainerRepository.remove(user);
      return { message: 'Entertainer Deleted Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
