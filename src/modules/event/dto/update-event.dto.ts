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
  @IsOptional()
  @IsNumber()
  neighbourhoodId: number;
}
