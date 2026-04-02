import { IsNotEmpty, IsNumber } from 'class-validator';

export class BookLater {
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @IsNumber()
  @IsNotEmpty()
  entId: number;

  @IsNumber()
  @IsNotEmpty()
  venueId: number;
}
