import { Optional } from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SeriesDto {
  @IsString()
  seriesName: string;

  @IsArray()
  @IsOptional()
  events: [];

  @IsArray()
  @IsOptional()
  existingEvents: number[];

  @IsOptional()
  venueId: number;
}

export class UpdateSeriesDto extends PartialType(SeriesDto) {
  @IsArray()
  @IsOptional()
  updatedEvents: [];

  @IsNotEmpty()
  seriesId: number;
}
