import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/create-notification.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationQueryDto } from './dto/notification-query-dto';

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
  async getUserNotifications(@Query() query: NotificationQueryDto, @Req() req) {
    const { userId } = req.user; // assuming you attach user to request after auth

    return await this.notificationService.getNotifications(userId, query);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: number) {
    return this.notificationService.markAsRead(Number(id));
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    const { userId } = req.user;
    return this.notificationService.markAllAsRead(userId);
  }
}
