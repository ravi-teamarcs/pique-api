import {
  IsArray,
  IsNumber,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class CategoryMappingDto {
  @IsNumber()
  categoryId: number;

  @IsArray()
  @ArrayNotEmpty()
  subCategoryIds: number[];
}

class EntertainerMappingDto {
  @IsNumber()
  entertainerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryMappingDto)
  categories: CategoryMappingDto[];
}

class EventMappingDto {
  @IsNumber()
  eventId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerMappingDto)
  entertainers: EntertainerMappingDto[];
}

export class SeriesBookingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventMappingDto)
  eventMappings: EventMappingDto[];
}
