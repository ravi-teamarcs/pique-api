import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  ValidateNested,
  IsString,
} from 'class-validator';

class EntertainerSpecificCategoryDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  specificCategoryName: string;
}

class EntertainerCategoryDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  categoryName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerSpecificCategoryDto)
  specific_category: EntertainerSpecificCategoryDto[];
}

export class EntertainerBookingDto {
  @IsInt()
  @IsNotEmpty()
  entertainerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerCategoryDto)
  categories: EntertainerCategoryDto[];
}

export class SeriesBookingDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  eventIds: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerBookingDto)
  @IsNotEmpty()
  entertainers: EntertainerBookingDto[];
}
