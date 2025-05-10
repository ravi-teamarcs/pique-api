import { IsArray, IsDateString } from 'class-validator';

export class UnavailableDateDto {
  @IsArray()
  @IsDateString({}, { each: true })
  dates: string[]; // ISO date strings, e.g., ['2025-04-07', '2025-04-12']
}
