import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber } from 'class-validator';

export class CreateBookingDto {
  

  @ApiProperty({ description: 'Timing of the Show' })
  @IsString()
  @IsNotEmpty()
  showTime: string;

  @ApiProperty({ description: 'Date of the Show' })
  @IsString()
  @IsNotEmpty()
  showDate: string;

  @ApiProperty({
    description: 'Special Notes for the Booking',
    required: false,
  })
  @IsString()
  specialNotes?: string;

  @ApiProperty({ description: 'Location of the Show' })
  @IsString()
  @IsNotEmpty()
  specificLocation: string;

  @ApiProperty({
    description: 'Role of entertainer (soloist, duo, trio, ensemble)',
  })
  @IsNotEmpty()
  @IsEnum(['soloist', 'duo', 'trio', 'ensemble'])
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @ApiProperty({ example: 1, description: 'Reference to the Venue' })
  @IsNumber()
  @IsNotEmpty()
  venueId: number;

  @ApiProperty({ example: [], description: 'Reference to the Entertainers' })
  @IsNumber()
  @IsNotEmpty()
  entertainerId: number;

  // @ApiProperty({ example: 1, description: 'Reference to the Entertainer' })
  // @IsNumber()
  // @IsNotEmpty()
  // userId: number;
}

