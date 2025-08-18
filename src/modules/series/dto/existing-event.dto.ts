import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AddExistingEventToSeriesDto {
  @IsNotEmpty()
  @IsNumber()
  seriesId: number;
  @IsNotEmpty()
  @IsNumber()
  eventId: number;
}
