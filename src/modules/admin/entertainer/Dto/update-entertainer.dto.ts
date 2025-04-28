import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { GeneralInfoDto } from './create-entertainer.dto';
import { PartialType } from '@nestjs/swagger';

class UpdateGeneralInfoDto extends PartialType(GeneralInfoDto) {}
class UserDto {
  @IsString()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  password: string;
}
export class UpdateEntertainerDto {
  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  createLogin: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('Failed to parse value:', value);
        return value;
      }
    }
    return value;
  })
  @Type(() => UserDto)
  user?: UserDto;
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('Failed to parse value:', value);
        return value;
      }
    }
    return value;
  })
  @Type(() => UpdateGeneralInfoDto)
  entertainer?: UpdateGeneralInfoDto;
}

class UpdateAddressDto {
  @IsString()
  @IsOptional()
  addressLine1: string;
  @IsString()
  @IsOptional()
  addressLine2: string;

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
  @IsString()
  @IsOptional()
  zipCode: string;
}

export { UpdateAddressDto };
