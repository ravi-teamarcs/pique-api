import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsIn([
    'published',
    'unpublished',
    'confirmed',
    'completed',
    'cancelled',
    'rescheduled',
  ])
  @IsOptional()
  status:
    | 'published'
    | 'unpublished'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'rescheduled';
}
