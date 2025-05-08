import {
  IsArray,
  ArrayUnique,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EntertainerAvailabilityDto {
  entertainer_id?: number;

  @IsArray()
  @ArrayUnique()
  @IsDateString({}, { each: true }) // Ensure dates are valid ISO strings
  unavailable_dates: string[];

  @IsArray()
  @ArrayUnique()
  @IsDateString({}, { each: true }) // Ensure dates are valid ISO strings
  available_dates: string[];

  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  unavailable_weekdays: number[]; // 0=Sunday, 6=Saturday

  @IsInt()
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
