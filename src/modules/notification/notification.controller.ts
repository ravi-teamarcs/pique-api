import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/create-notification.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    description: 'Notification sent successfully.',
  })
  @Post()
  @UseGuards(JwtAuthGuard)
  sendNotification(@Body() pushNotification: sendNotificationDTO, @Req() req) {
    const { userId } = req.user;
    this.notificationService.sendPush(pushNotification, userId);
  }
}
