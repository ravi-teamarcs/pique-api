import { IsNotEmpty, IsNumber } from 'class-validator';

export class RemoveEvent {
  @IsNotEmpty()
  @IsNumber()
  eventId: number;

  @IsNotEmpty()
  @IsNumber()
  seriesId: number;
}
