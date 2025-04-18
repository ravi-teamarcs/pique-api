import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsDate,
  IsOptional,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 1, description: 'Venue for  which event is created' })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  venueId: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  userId: number;

  @ApiProperty({
    example: 'singing concert',
    description: 'Title of the event',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'Start dateTime of the event',
  })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'End dateTime of the event',
  })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'Noida', description: 'Type of event' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Description of event' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsEnum(['none', 'daily', 'weekly', 'monthly'])
  @IsNotEmpty()
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';

  @IsEnum(['unpublished', 'scheduled', 'confirmed', 'cancelled', 'completed'])
  @IsNotEmpty()
  status:
    | 'unpublished'
    | 'scheduled'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'scheduled';

  @ApiProperty({ example: false, description: 'Is Event creator Admin ?' })
  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => value === 'true')
  isAdmin: boolean;
}
