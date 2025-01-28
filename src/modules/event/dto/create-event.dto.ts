import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsNumber()
  userId: number;

  @IsString()
  title: string;

  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @IsDateString()
  date: string;

  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format
  @IsString()
  time: string;

  @IsString()
  location: string;

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsOptional() // Image is optional
  @IsString()
  image?: string;

  @IsString()
  status: string;

  @IsString()
  additionalNotes: string;
}
