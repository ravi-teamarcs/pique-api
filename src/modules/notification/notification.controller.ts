import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/create-notification.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    description: 'Notification sent successfully.',
  })
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  sendNotification(@Body() pushNotification: sendNotificationDTO, @Req() req) {
    const { userId } = req.user;
    return this.notificationService.sendPush(pushNotification, userId);
  }

  @Roles('findAll')
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserNotifications(
    @Query('unread') unread: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req,
  ) {
    const { userId } = req.user; // assuming you attach user to request after auth

    const result = await this.notificationService.getNotifications(
      userId,
      unread === 'true',
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
