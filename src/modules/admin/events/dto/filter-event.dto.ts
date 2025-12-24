import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class FilterEventDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;
}
