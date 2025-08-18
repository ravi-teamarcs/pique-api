import { IsNumber, IsString } from 'class-validator';

export class SeriesDto {
  @IsString()
  seriesName: string;
}
