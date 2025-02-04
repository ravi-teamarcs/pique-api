import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ description: 'User who is creating event' })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'Venue for  which event is created' })
  @IsNumber()
  venueId: number;

  @ApiProperty({ description: 'Title of the event' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Date of the event' })
  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @IsDateString()
  date: string;

  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format
  @ApiProperty({ description: 'Type of event' })
  @IsString()
  time: string;

  @ApiProperty({ description: 'Type of event' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Description of event' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Type of the event' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Status of the event ' })
  @IsString()
  status: string;
}
