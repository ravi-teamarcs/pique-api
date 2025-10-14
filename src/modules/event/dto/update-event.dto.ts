import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @IsOptional()
  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  subCategoryId: number;
}
