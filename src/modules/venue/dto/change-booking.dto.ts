import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DateTimeChangeDto {
  @ApiProperty({ description: 'Booking Id ' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ description: 'Venue id against whom  booking is done ' })
  @IsNumber()
  @IsNotEmpty()
  venueId: number;

  @ApiProperty({ description: 'Requested Time' })
  @IsString()
  reqShowTime: string;

  @ApiProperty({ description: 'Requested Date' })
  @IsString()
  reqShowDate: string;
}
