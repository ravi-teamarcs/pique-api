import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
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

  @IsNotEmpty()
  @IsString()
  eventDate: string;

  @ApiProperty({ description: 'Description of event' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Description of event' })
  @IsNotEmpty()
  @IsNumber()
  neighbourhoodId: number;
}
