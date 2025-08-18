import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SeriesDto {
  @IsString()
  seriesName: string;

  @IsArray()
  events: [];
  @IsOptional()
  venueId: number;
}
