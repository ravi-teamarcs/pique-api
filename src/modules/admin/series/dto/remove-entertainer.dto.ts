import { IsArray, IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class RemoveEntertianerBookingDto {
  @IsInt()
  @IsNotEmpty()
  seriesId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  entertainerIds: number[];
}
