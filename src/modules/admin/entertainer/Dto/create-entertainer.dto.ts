import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsIn,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from 'src/modules/users/dto/users.dto';

class GeneralInfoDto {
  @IsString()
  @IsNotEmpty()
  stageName: string;

  @IsString()
  @IsNotEmpty()
  entertainerName: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  category: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  specific_category: number;

  @IsString()
  @IsNotEmpty()
  bio: string;

  @IsIn(['solo', 'duo', 'trio', 'ensemble'])
  @IsNotEmpty()
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsNumber()
  @IsNotEmpty()
  pricePerEvent: number;
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // If it's already an array (e.g., services[]=A&services[]=B), return as-is
    if (Array.isArray(value)) return value;
    // If it's a comma-separated string: "A,B,C"
    if (typeof value === 'string')
      return value.split(',').map((item) => item.trim());
    return [];
  })
  services: string[];
}

export class CreateEntertainerDto {
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
        return value;
      }
    }
    return value;
  })
  @Type(() => CreateUserDto)
  user?: CreateUserDto;

  @IsNotEmpty()
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
  @Type(() => GeneralInfoDto)
  entertainer: GeneralInfoDto;
}
