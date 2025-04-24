import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  IsIn,
} from 'class-validator';

export class CreateEntertainerDto {
  @ApiProperty({
    example: 'Raghav Singh',
    description: 'Name of the entertainer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'Category  of the entertainer' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  category: number;

  @ApiProperty({
    example: 13,
    description: 'specific-category of the entertainer',
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  specific_category: number;

  @ApiProperty({
    example: 'performed in  a lot of shows.',
    description: 'Bio of the entertainer',
  })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({
    example: 'solo',
    description: 'Role of entertainer (soloist , duo , trio)',
  })
  @IsIn(['solo', 'duo', 'trio', 'ensemble'])
  @IsNotEmpty()
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @ApiProperty({
    example: 3000,
    description: 'Price per Event Entertainer Charges',
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pricePerEvent: number;

  @ApiProperty({
    example: 'www.fb.com/raghavThakur',
    description: 'Social Media Link of Entertainer',
  })
  @IsString()
  socialLinks?: string;

  @ApiProperty({ example: 'yes', description: 'Vaccinated or Not' })
  @IsIn(['yes', 'no'])
  vaccinated: 'yes' | 'no';

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

  @IsString()
  @IsNotEmpty()
  address: string;

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

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;
}

class Step1Dto {}
class Step2Dto {}
class Step3Dto {}
class Step4Dto {}
