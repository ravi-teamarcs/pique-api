import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { CreateUserDto } from '../../users/Dto/create-user.dto';
import { Transform } from 'class-transformer';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  city: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  state: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  country: number;

  @IsString()
  @IsNotEmpty()
  zipCode: string;
}

class Neighbourhood {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  contactPerson: string;

  @IsNotEmpty()
  @IsString()
  contactNumber: string;
}

export class CreateVenueRequestDto {
  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => (value === 'true' ? true : false))
  createLogin: boolean;

  @IsOptional()
  user?: CreateUserDto;
  @IsNotEmpty()
  venue: CreateVenueDto;
  @IsOptional()
  neighbourhood: Neighbourhood[];
}
