import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsNotEmpty()
  pricePerExtra30Min: number;

  @IsString()
  @IsOptional()
  date: string;
}

export class RateCardDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BasePriceDto)
  @IsOptional()
  rates?: BasePriceDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SpecialPriceDto)
  @IsOptional()
  specialPrices?: SpecialPriceDto[];
}
