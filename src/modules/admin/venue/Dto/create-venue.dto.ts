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

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsNumber()
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
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  createLogin: boolean;

  @IsOptional()
  user?: CreateUserDto;
  @IsNotEmpty()
  venue: CreateVenueDto;
  @IsOptional()
  neighbourhood: Neighbourhood[];
}
