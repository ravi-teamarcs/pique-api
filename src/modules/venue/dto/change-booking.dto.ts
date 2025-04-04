import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ChangeBooking {
  @ApiProperty({ description: 'Booking Id ' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ description: 'Requested Time' })
  @IsString()
  reqShowTime: string;

  @ApiProperty({ description: 'Requested Date' })
  @IsString()
  reqShowDate: string;

  @ApiProperty({ description: 'Requested Event' })
  @IsNumber()
  reqEventId: number;
}
