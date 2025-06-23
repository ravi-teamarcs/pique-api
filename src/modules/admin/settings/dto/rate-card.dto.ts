import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Column } from 'typeorm';

class BasePriceDto {
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @IsNumber()
  @IsNotEmpty()
  subcategoryId: number;

  @IsNumber()
  @IsOptional()
  pricePerExtra30Min: number;
}

class SpecialPriceDto {
  @IsNumber()
  @IsNotEmpty()
  specialPrice: number;

  @IsNumber()
  @IsNotEmpty()
  subcategoryId: number;

  @IsNumber()
  @IsOptional()
  date: string;
}

export class RateCardDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BasePriceDto)
  @IsOptional()
  rates: BasePriceDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BasePriceDto)
  @IsOptional()
  specialRates: SpecialPriceDto[];
}
