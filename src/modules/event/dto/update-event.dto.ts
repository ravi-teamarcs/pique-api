import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
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
  eventDate: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  startTime: string;

  @IsString()
  @IsOptional()
  location: string;

  @IsOptional()
  @IsString()
  description: string;
}
