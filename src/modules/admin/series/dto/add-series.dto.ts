import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddSeriesDto {
  @IsString()
  seriesName: string;

  @IsArray()
  @IsOptional()
  events: [];

  @IsArray()
  @IsOptional()
  existingEvents: Record<string, any>[]; // or your actual DTO type
}

export class UpdateSeriesDto extends PartialType(AddSeriesDto) {
  @IsNotEmpty()
  @IsNumber()
  seriesId: number;

  @IsArray()
  @IsOptional()
  updatedEvents: number[];
}
