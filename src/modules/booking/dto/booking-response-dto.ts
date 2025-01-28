import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { type } from 'os';

export class VenueResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ description: 'If user is venue' })
  @IsNotEmpty()
  status:
    | 'pending'
    | 'confirmed'
    | 'accepted'
    | 'cancelled'
    | 'rejected'
    | 'completed'
    | 'rescheduled';
}
export class EntertainerResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;
  @ApiProperty({ description: 'If user is entertainer' })
  @IsNotEmpty()
  isAccepted: 'accepted' | 'rejected';
}
