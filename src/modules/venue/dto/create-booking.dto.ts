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

// @ApiProperty({ description: 'Status of the Booking' })
//   @IsEnum(['pending', 'confirmed', 'cancelled', 'rejected', 'rescheduled'])
//   @IsNotEmpty()
//   status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'rescheduled';

//   @ApiProperty({ description: 'Timing of the Show' })
//   @IsString()
//   @IsNotEmpty()
//   showTime: string;

//   @ApiProperty({ description: 'Date of the Show' })
//   @IsString()
//   @IsNotEmpty()
//   showDate: string;

//   @ApiProperty({ description: 'Special Notes for the Booking' })
//   @IsString()
//   @IsNotEmpty()
//   specialNotes: string;

//   @ApiProperty({ description: 'Location of the Show' })
//   @IsString()
//   @IsNotEmpty()
//   specificLocation: string;

//   @ApiProperty({ description: ' Role of entertainer (soloist , duo , trio)' })
//   @IsNotEmpty()
//   @IsEnum(['soloist', 'duo', 'trio', 'ensemble'])
//   performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

//   @ApiProperty({ example: 1 })
//   @IsInt()
//   @IsNotEmpty()
//   venueId: number; // Reference to the Venue

//   @ApiProperty({ example: 1 })
//   @IsInt()
//   @IsNotEmpty()
//   entertainerId: number; // Reference to the Venue
