import { ApiProperty } from '@nestjs/swagger';
class sendNotificationDTO {
  @ApiProperty()
  title: string;
  @ApiProperty()
  body: string;
  @ApiProperty()
  deviceId: string;
}

export { sendNotificationDTO };
