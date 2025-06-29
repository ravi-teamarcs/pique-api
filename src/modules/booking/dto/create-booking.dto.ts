import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  showStartDateTime: string;

  @ApiProperty({
    example: 'Please be on time',
    description: 'Special Notes for the Booking',
    required: false,
  })
  @IsString()
  specialNotes?: string;

  @ApiProperty({ example: 1, description: 'Reference to the Entertainers' })
  @IsNumber()
  @IsNotEmpty()
  entertainerId: number;
  @ApiProperty({
    example: 1,
    description: 'Event id for which booking is created.',
  })
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsNumber()
  @IsNotEmpty()
  subcategoryId: number;
}
