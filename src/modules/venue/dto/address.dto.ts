import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class AddressDto {
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => Number(value))
  city: number;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => Number(value))
  state: number;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => Number(value))
  country: number;

  @IsNotEmpty()
  @IsString() // or use specific locale like 'IN', 'US'
  zipcode: string;
}
