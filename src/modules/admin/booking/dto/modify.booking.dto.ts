import { ApiProperty } from '@nestjs/swagger';

class ModifyBookingDto {
  @ApiProperty({ example: 40, description: 'BookingId ' })
  bookingId: number;
  @ApiProperty({ description: 'Accepts an object of key value pair' })
  fieldsToUpdate: Record<string, any>;
}

export { ModifyBookingDto };
