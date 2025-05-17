import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
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
      const payload = { markupValue:value, markupType: type };

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
}
