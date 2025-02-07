import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsNotEmpty } from 'class-validator';

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

  @ApiProperty({ example: '12-10-2025', description: 'Date of the event' })
  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @IsNotEmpty()
  @IsString()
  date: string;

  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format
  @ApiProperty({ example: '12:04', description: 'Type of event' })
  @IsNotEmpty()
  @IsString()
  time: string;

  @ApiProperty({ example: 'Noida', description: 'Type of event' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Description of event' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'singing', description: 'Type of the event' })
  @IsNotEmpty()
  @IsString()
  type: string;
}
