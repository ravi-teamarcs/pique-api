import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RateCardDto } from './dto/rate-card.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';

@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('markup')
  async getMarkup() {
    return this.settingsService.getActiveSetting();
  }

  @Put('markup')
  async updateMarkup(
    @Body() body: { type: 'fixed' | 'percentage'; value: number },
  ) {
    return this.settingsService.updateMarkup(body.type, body.value);
  }

  @Patch('category/base-price')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async setCategoryBasePrice(@Body() dto: RateCardDto) {
    return this.settingsService.setCategoryBaseAndSpecialPrice(dto);
  }

  @Get('category/base-price')
  async getCategoryPrice() {
    return this.settingsService.getCategoryBaseAndSpecialPrice();
  }

  @Delete('category/base-price/:id')
  async deleteBasePrice(@Param() id: number) {
    return this.settingsService.deleteSpecialPrice(id);
  }
}
