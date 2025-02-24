import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Recurring, Status } from 'src/common/enums/event.enum';

export class UpdateEventDto {
  @ApiProperty({
    example: 1,
    description: 'Event Id which you want to Update.',
  })
  @IsNotEmpty()
  @IsNumber()
  eventId: number; //  //  Update eventId in the request body.

  @ApiProperty({
    example: 'singing',
    description: 'title of the event .',
  })
  @IsOptional()
  @IsString()
  title: string;
  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'End dateTime of the event',
  })
  @IsOptional()
  @IsString()
  endTime: string;
  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format
  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'Start dateTime of the event',
  })
  @IsOptional()
  @IsString()
  startTime: string;

  @ApiProperty({ example: 'Noida', description: 'Type of event' })
  @IsString()
  @IsOptional()
  location: string;

  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'Start dateTime of the event',
  })
  @IsOptional()
  @IsString()
  description: string;

  // @ApiProperty({ example: 'singing', description: 'Type of the event' })
  // @IsOptional()
  // @IsString()
  // type: string;

  @ApiProperty({ example: false, description: 'Is Event creator Admin ?' })
  @IsOptional()
  @IsBoolean()
  isAdmin: boolean;

  @ApiProperty({ example: 'none', description: 'Describe event recurrence' })
  @IsEnum(Recurring)
  @IsOptional()
  recurring: Recurring;

  @ApiProperty({
    example: 'scheduled',
    description: 'Status of the Event',
  })
  @IsEnum(Status)
  @IsOptional()
  status: Status;
}
