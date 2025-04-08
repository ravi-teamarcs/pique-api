import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';
import {
  Availability,
  PerformanceType,
  Vaccinated,
} from 'src/common/enums/entertainer.enum';

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
    example: '9876543210',
    description: 'Enter the Phone Number of Entertainer',
  })
  @IsString()
  @IsNotEmpty()
  phone1: string;

  @ApiProperty({
    example: '6230846541',
    description: 'Enter the alternative Phone number of Entertainer',
  })
  @IsString()
  @IsNotEmpty()
  phone2: string;

  @ApiProperty({
    example: 'solo',
    description: 'Role of entertainer (soloist , duo , trio)',
  })
  @IsEnum(PerformanceType)
  @IsNotEmpty()
  performanceRole: PerformanceType;

  @ApiProperty({
    example: 'yes',
    description: 'Availability schedule of the entertainer',
  })
  @IsEnum(Availability)
  @IsNotEmpty()
  availability: Availability;

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

  @ApiProperty({ example: 'active', description: 'Status of Entertainer' })
  @IsString()
  status: string;
}
