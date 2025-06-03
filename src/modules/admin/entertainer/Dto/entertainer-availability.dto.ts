import {
  IsArray,
  ArrayUnique,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const SLOT_OPTIONS = ['morning', 'afternoon', 'evening', 'whole-day'];
export class UnavailableDateDto {
  @IsString()
  date: string;

  @IsArray()
  @IsIn(SLOT_OPTIONS, { each: true })
  slots: string[];
}

export class EntertainerAvailabilityDto {
  entertainer_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableDateDto)
  unavailable_dates: UnavailableDateDto[];

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
