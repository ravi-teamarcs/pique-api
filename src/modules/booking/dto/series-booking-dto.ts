import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
export class EntertainerBookingDto {
  @IsInt()
  @IsNotEmpty()
  entertainerId: number;

  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @IsInt()
  @IsNotEmpty()
  subCategoryId: number;
}

export class SeriesBookingDto {
  @IsArray()
  @IsInt({ each: true }) // ensures every value is an integer
  @IsNotEmpty()
  eventIds: number[];

  @IsArray()
  @ValidateNested({ each: true }) // validates each object inside entertainers[]
  @Type(() => EntertainerBookingDto)
  @IsNotEmpty()
  entertainers: EntertainerBookingDto[];
}
