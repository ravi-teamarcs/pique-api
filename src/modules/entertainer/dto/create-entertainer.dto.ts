import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { PerformanceType, Vaccinated } from 'src/common/enums/entertainer.enum';

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
  @IsEnum(PerformanceType)
  @IsNotEmpty()
  performanceRole: PerformanceType;

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
  @IsEnum(Vaccinated)
  vaccinated: Vaccinated;

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

  @IsOptional()
  @IsNotEmpty()
  services?: string[];

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string; // Accepts only date in ISO format, e.g. "2025-04-09"
}
