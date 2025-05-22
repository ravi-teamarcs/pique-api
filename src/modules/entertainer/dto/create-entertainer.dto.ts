import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
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

  @ApiProperty({
    example: 'Raghav Singh',
    description: 'Name of the entertainer',
  })
  @IsString()
  @IsNotEmpty()
  entertainerName: string;

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
  socialLinks?: Record<string, string>;

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
  dob: string; // Accepts only date in ISO format, e.g. "2025-04-09"
}
class Step1Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({
    example: 'Raghav Singh',
    description: 'Name of the entertainer',
  })
  @IsString()
  @IsOptional()
  entertainerName: string;

  @ApiProperty({
    example: 'Raghav Singh',
    description: 'Name of the entertainer',
  })
  @IsString()
  @IsOptional()
  stageName: string;

  @IsOptional()
  @IsNumber()
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

  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2: string;
}
class Step2Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @IsString()
  @IsOptional()
  bio: string;
}
class Step3Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({ example: 'yes', description: 'Vaccinated or Not' })
  @IsOptional()
  @IsEnum(Vaccinated)
  vaccinated: Vaccinated;
}
class Step4Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @IsString()
  @IsOptional()
  contactPerson: string;

  @IsString()
  @IsOptional()
  contactNumber: string;
}
class Step5Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({
    example: 'www.fb.com/raghavThakur',
    description: 'Social Media Link of Entertainer',
  })
  @IsString()
  @IsOptional()
  socialLinks?: Record<string, string>;
}
class Step6Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({ example: 1, description: 'Category  of the entertainer' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  category: number;
}
class Step7Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({
    example: 13,
    description: 'specific-category of the entertainer',
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  specific_category: number;
}
class Step8Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @ApiProperty({
    example: 'solo',
    description: 'Role of entertainer (soloist , duo , trio)',
  })
  @IsEnum(PerformanceType)
  @IsOptional()
  performanceRole: PerformanceType;
}
class Step9Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
  @IsOptional()
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
class Step10Dto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}

export {
  Step1Dto,
  Step2Dto,
  Step3Dto,
  Step4Dto,
  Step5Dto,
  Step6Dto,
  Step7Dto,
  Step8Dto,
  Step9Dto,
  Step10Dto,
};
