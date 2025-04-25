import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateEntertainerDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsObject()
  @IsNotEmpty()
  fieldsToUpdate: Record<string, any>;
}
 class UpdateAddressDto {
  @IsString()
  @IsOptional()
  address: string;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  city: number;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  state: number;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  country: number;
}

export { UpdateAddressDto };
