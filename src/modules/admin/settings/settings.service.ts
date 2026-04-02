import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { Repository } from 'typeorm';
import { RateCardDto } from './dto/rate-card.dto';
import { SubcategoryRate } from './entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from './entities/special-subcategory-prices.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EntertainerCategorySubcategory } from 'src/modules/entertainer/entities/entertainer-category-subcategory.entity';
import { Categories } from '../entertainer/entities/Category.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(SubcategoryRate)
    private readonly subcatRateRepo: Repository<SubcategoryRate>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepo: Repository<Entertainer>,
    @InjectRepository(Categories)
    private readonly categoryRepo: Repository<Categories>,
    @InjectRepository(SpecialSubcategoryPrice)
    private readonly specialSubcatRateRepo: Repository<SpecialSubcategoryPrice>,
    @InjectRepository(EntertainerCategorySubcategory)
    private readonly entCatSubcatRepo: Repository<EntertainerCategorySubcategory>,
  ) {}

  async getActiveSetting() {
    const setting = await this.settingRepo.findOne({
      where: { isActive: true },
    });

    return {
      message: 'Markup setting returned Successfully',
      data: setting,
      status: true,
    };
  }

  async updateMarkup(type: 'fixed' | 'percentage', value: number) {
    const { data } = await this.getActiveSetting();

    if (data) {
      const payload = { markupValue: value, markupType: type };

      await this.settingRepo.update({ id: data.id }, payload);
      return { message: 'markup setting updated', status: true };
    }

    const newSetting = this.settingRepo.create({
      markupType: type,
      markupValue: value,
    });
    const savedSetting = await this.settingRepo.save(newSetting);
    return {
      message: `markup setting saved successfully`,
      data: savedSetting,
      status: true,
    };
  }

  async setCategoryBaseAndSpecialPrice(dto: RateCardDto) {
    try {
      const { rates, specialPrices } = dto;

      if (rates && rates.length > 0) {
        for (const rate of rates) {
          const alreadyExists = await this.subcatRateRepo.findOne({
            where: { subcategoryId: rate.subcategoryId },
          });

          if (alreadyExists) {
            await this.subcatRateRepo.update({ id: alreadyExists.id }, rate);
          } else {
            const newCategoryRate = this.subcatRateRepo.create(rate);
            await this.subcatRateRepo.save(newCategoryRate);
          }
        }
      }

      if (specialPrices && specialPrices.length > 0) {
        for (const rate of specialPrices) {
          const alreadyExists = await this.specialSubcatRateRepo.findOne({
            where: { subcategoryId: rate.subcategoryId, date: rate.date },
          });
          if (alreadyExists) {
            await this.specialSubcatRateRepo.update(
              { id: alreadyExists.id },
              rate,
            );
          } else {
            const newCategoryRate = this.specialSubcatRateRepo.create(rate);
            await this.specialSubcatRateRepo.save(newCategoryRate);
          }
        }
      }

      return {
        message: 'Category price setting saved successfully',
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getCategoryBaseAndSpecialPrice() {
    try {
      const response = {};
      const categoryBaseRates = await this.subcatRateRepo
        .createQueryBuilder('rate')
        .leftJoin('categories', 'subcat', 'subcat.id = rate.subcategoryId')
        .select([
          'subcat.id AS subCategoryId',
          'subcat.name AS subCategoryName',
          'rate.basePrice AS basePrice',
          'rate.pricePerExtra30Min AS pricePerExtra30Min',
        ])
        .getRawMany();
      // Get Special Rates
      response['rates'] = categoryBaseRates;

      const categoryspecialRates = await this.specialSubcatRateRepo
        .createQueryBuilder('rate')
        .leftJoin('categories', 'subcat', 'subcat.id = rate.subcategoryId')
        .select([
          'subcat.id AS subCategoryId',
          'subcat.name AS subCategoryName',
          'rate.specialPrice AS specialPrice',
          'rate.pricePerExtra30Min AS pricePerExtra30Min',
          'rate.date AS date',
        ])
        .getRawMany();

      response['specialRates'] = categoryspecialRates;

      return {
        message: 'Category wise base and special price fetched successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteSpecialPrice(id: number) {
    try {
      const specialPrice = await this.specialSubcatRateRepo.findOne({
        where: { id },
      });

      if (!specialPrice) {
        throw new NotFoundException('specialPrice not Found');
      }

      await this.specialSubcatRateRepo.remove(specialPrice);
      return {
        message: 'Special Subcategory Price deleted successfully',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEntertainerCategoriesWithRates(entertainerId: number) {
    try {
      // 1️⃣ Fetch entertainer categories (category_id and subcategory_ids)
      const ecsRaw = await this.entCatSubcatRepo
        .createQueryBuilder('ecs')
        .leftJoin('categories', 'cat', 'cat.id = ecs.category_id')
        .select([
          'ecs.category_id AS categoryId',
          'ecs.subcategory_ids AS subCategoryIds',
          'cat.name AS categoryName',
        ])
        .where('ecs.entertainer_id = :entertainerId', { entertainerId })
        .getRawMany();

      if (!ecsRaw.length) return [];

      // 2️⃣ Collect all subcategory IDs across all categories
      const allSubcategoryIds = ecsRaw.flatMap((ecs) =>
        ecs.subCategoryIds
          ? ecs.subCategoryIds.split(',').map((id: string) => Number(id))
          : [],
      );

      if (!allSubcategoryIds.length) return [];

      // 3️⃣ Fetch subcategory names
      const subcategories = await this.categoryRepo
        .createQueryBuilder('sub')
        .select(['sub.id', 'sub.name'])
        .where('sub.id IN (:...subIds)', { subIds: allSubcategoryIds })
        .getRawMany();

      // 4️⃣ Fetch subcategory rates
      const subcategoryRates = await this.subcatRateRepo
        .createQueryBuilder('sr')
        .where('sr.subcategoryId IN (:...subIds)', {
          subIds: allSubcategoryIds,
        })
        .getMany();

      // 5️⃣ Fetch special prices
      const specialPrices = await this.specialSubcatRateRepo
        .createQueryBuilder('ssp')
        .where('ssp.subcategoryId IN (:...subIds)', {
          subIds: allSubcategoryIds,
        })
        .getMany();

      // 6️⃣ Build nested result
      const result = ecsRaw.map((ecs) => {
        const subIds = ecs.subCategoryIds
          ? ecs.subCategoryIds.split(',').map((id: string) => Number(id))
          : [];

        const specific_category = subIds.map((subId) => {
          const sub = subcategories.find((s) => s.sub_id === subId); // getRawMany returns alias with table_column
          const rate = subcategoryRates.find((r) => r.subcategoryId === subId);
          const specials = specialPrices
            .filter((sp) => sp.subcategoryId === subId)
            .map((sp) => ({
              date: sp.date,
              price: sp.specialPrice,
              pricePerExtra30Min: sp.pricePerExtra30Min,
            }));

          return {
            id: subId,
            name: sub?.sub_name || `Subcategory ${subId}`,
            basePrice: rate?.basePrice || 0,
            pricePerExtra30Min: rate?.pricePerExtra30Min || 0,
            specialPrices: specials,
          };
        });

        return {
          id: ecs.categoryId,
          categoryName: ecs.categoryName,
          specific_category,
        };
      });

      return result;
    } catch (err) {
      console.error('Error fetching entertainer category data:', err);
      throw err;
    }
  }
}
