import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '12:10:01', description: 'Timing of the Show' })
  @IsString()
  @IsNotEmpty()
  showTime: string;

  @ApiProperty({ example: '2024-01-17', description: 'Date of the Show' })
  @IsString()
  @IsNotEmpty()
  showDate: string;

  @ApiProperty({
    example: 'Please be on time',
    description: 'Special Notes for the Booking',
    required: false,
  })
  @IsString()
  specialNotes?: string;

  @ApiProperty({
    example: 'duo',
    description: 'Role of entertainer (soloist, duo, trio, ensemble)',
  })
  @ApiProperty({ example: 1, description: 'Reference to the Venue' })
  @IsNumber()
  @IsNotEmpty()
  venueId: number;

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

  @ApiProperty({
    example: 'soloist',
    description: 'Performance type of entertainer',
  })
  @IsNotEmpty()
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';
}
