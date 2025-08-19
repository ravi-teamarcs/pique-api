import { Optional } from '@nestjs/common';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SeriesDto {
  @IsString()
  seriesName: string;

  @IsArray()
  @IsOptional()
  events: [];

  @IsArray()
  @Optional()
  existingEvents: number[];

  @IsOptional()
  venueId: number;
}
