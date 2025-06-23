import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { Repository } from 'typeorm';
import { RateCardDto } from './dto/rate-card.dto';
import { SubcategoryRate } from './entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from './entities/special-subcategory-prices.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(SubcategoryRate)
    private readonly subcatRateRepo: Repository<SubcategoryRate>,
    @InjectRepository(SubcategoryRate)
    private readonly specialSubcatRateRepo: Repository<SpecialSubcategoryPrice>,
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
      const { rates, specialRates } = dto;

      if (rates && rates.length > 0) {
        for (const rate of rates) {
          const newCategoryRate = this.subcatRateRepo.create(rate);
          this.subcatRateRepo.save(newCategoryRate);
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
      // Get Base Rates

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

      const categoryspecialRates = await this.subcatRateRepo
        .createQueryBuilder('rate')
        .leftJoin('categories', 'subcat', 'subcat.id = rate.subcategoryId')
        .select([
          'subcat.id AS subCategoryId',
          'subcat.name AS subCategoryName',
          'rate.basePrice AS basePrice',
          'rate.pricePerExtra30Min AS pricePerExtra30Min',
        ])
        .getRawMany();

      return {
        message: 'Category wise base and special price fetched successfully',
        data: categoryBaseRates,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
