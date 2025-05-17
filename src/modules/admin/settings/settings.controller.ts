import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';

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
}
