import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';

export class AdminBookingResponseDto {
  @ApiProperty({ example: 34, description: 'Booking id' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ example: 34, description: 'Booking id' })
  @IsIn(['confirmed', 'declined', 'cancelled', 'rescheduled', 'completed'])
  @IsNotEmpty()
  status: 'confirmed' | 'declined' | 'cancelled' | 'rescheduled' | 'completed';
}
