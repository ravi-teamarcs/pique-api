import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/create-notification.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendNotificationDTO } from './dto/send-notification.dto';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    description: 'Notification sent successfully.',
  })
  @Post()
  sendNotification(@Body() pushNotification: sendNotificationDTO) {
    this.notificationService.sendPush(pushNotification);
  }
}
