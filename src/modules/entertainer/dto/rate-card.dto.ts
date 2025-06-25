import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class BasePriceDto {
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @IsNumber()
  @IsNotEmpty()
  subcategoryId: number;

  @IsNumber()
  @IsNotEmpty()
  entertainerId: number;

  @IsNumber()
  @IsOptional()
  pricePerExtra30Min: number;
}

export class EntertainerRateCardDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BasePriceDto)
  @IsOptional()
  rates: BasePriceDto[];
}
