import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title: string;

  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @IsOptional()
  @IsDateString()
  date: string;

  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format

  @IsOptional()
  @IsString()
  time: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional() // Image is optional
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  additionalNotes: string;
}
