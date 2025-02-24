import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Recurring, Status } from 'src/common/enums/event.enum';

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

  @ApiProperty({ example: 'Noida', description: 'Type of event' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Description of event' })
  @IsNotEmpty()
  @IsString()
  description: string;

  // @ApiProperty({ example: 'singing', description: 'Type of the event' })
  // @IsNotEmpty()
  // @IsString()
  // type: string;

  @ApiProperty({ example: false, description: 'Is Event creator Admin ?' })
  @IsBoolean()
  @IsNotEmpty()
  isAdmin: boolean;

  @ApiProperty({ example: 'none', description: 'Describe event recurrence' })
  @IsEnum(Recurring)
  @IsNotEmpty()
  recurring: Recurring;

  @ApiProperty({
    example: 'scheduled',
    description: 'Status of the Event',
  })
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
