import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CategorySubcategoryDto } from './create-event.dto';

export class UpdateEventDto {
  @IsNotEmpty()
  @IsNumber()
  eventId: number;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  eventEndDateTime: string;

  @IsOptional()
  @IsString()
  eventStartDateTime: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  neighbourhoodId: number;

  @IsArray()
  @ArrayNotEmpty()
  categories: CategorySubcategoryDto[];
}
