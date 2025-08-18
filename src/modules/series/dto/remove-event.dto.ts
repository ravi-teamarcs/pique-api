import { IsNotEmpty, IsNumber } from 'class-validator';

export class RemoveEventDto {
  @IsNumber()
  @IsNotEmpty()
  eventId: number;
  @IsNumber()
  @IsNotEmpty()
  seriesId: number;
}
