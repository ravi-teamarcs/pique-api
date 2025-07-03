import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

class ModifyBookingDto {
  @ApiProperty({ description: 'Requested Time' })
  @IsString()
  eventStartDateTime: string;

  @ApiProperty({ description: 'Requested Date' })
  @IsString()
  eventEndDateTime: string;
}

export { ModifyBookingDto };
