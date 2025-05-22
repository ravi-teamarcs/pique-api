import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class AddressDto {
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsNumber({}, { message: 'City must be a valid number' })
  @Transform(({ value }) => {
    if (value === null || 'null') return null;
    return Number(value);
  })
  city: number | null;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  state: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  country: number;

  @IsString() // or use specific locale like 'IN', 'US'
  @IsNotEmpty()
  zipCode: string;
}
