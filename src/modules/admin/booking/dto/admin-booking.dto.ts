import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
} from 'class-validator';
class AdminBookingDto {
  @IsString()
  @IsNotEmpty()
  showStartDateTime: string;

  @ApiProperty({
    example: 'Please be on time',
    description: 'Special Notes for the Booking',
    required: false,
  })
  @IsOptional()
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
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  entertainerIds: number[];

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

export { AdminBookingDto };
