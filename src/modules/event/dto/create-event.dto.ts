import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 1, description: 'Venue for  which event is created' })
  @IsNotEmpty()
  @IsNumber()
  venueId: number;

  @ApiProperty({
    example: 'singing concert',
    description: 'Title of the event',
  })
  @IsOptional()
  @IsString()
  title: string;

  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'Start dateTime of the event',
  })
  @IsString()
  @IsNotEmpty()
  eventStartDateTime: string;

  @IsString()
  @IsNotEmpty()
  eventEndDateTime: string;

  @ApiProperty({ description: 'Description of event' })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Description of event' })
  @IsOptional()
  @IsNumber()
  neighbourhoodId: number;

  @IsNotEmpty()
  @IsInt()
  categoryId: number;

  @IsNotEmpty()
  @IsInt()
  subCategoryId: number;
}
