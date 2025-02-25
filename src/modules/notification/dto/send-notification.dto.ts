import { ApiProperty } from '@nestjs/swagger';
class sendNotificationDTO {
  @ApiProperty()
  title: string;
  @ApiProperty()
  body: string;
  @ApiProperty()
  deviceId: string;

  @ApiProperty({ type: Object, required: false }) // ✅ Explicitly define type
  data?: Record<string, any>;
}

export { sendNotificationDTO };
