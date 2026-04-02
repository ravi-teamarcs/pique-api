import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
const SLOT_OPTIONS = ['morning', 'afternoon', 'evening', 'whole_day'];
export class UnavailableDateDto {
  @IsString()
  date: string;

  @IsArray()
  @IsIn(SLOT_OPTIONS, { each: true })
  slots: string[];
}
export class UpdateAvailabilityDto {
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
