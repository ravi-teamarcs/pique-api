import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';

export class CreateEntertainerDto {
  @ApiProperty({
    example: 'Raghav Singh',
    description: 'Name of the entertainer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Singers', description: 'Type  of the entertainer' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: 'A Capella Group',
    description: 'Type  of the entertainer',
  })
  @IsString()
  @IsNotEmpty()
  specific_category: string;

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
    description: ' Role of entertainer (soloist , duo , trio)',
  })
  @IsEnum(['soloist', 'duo', 'trio', 'ensemble'])
  @IsNotEmpty()
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @ApiProperty({
    example: 'yes',
    description: 'Availability schedule of the entertainer',
  })
  @IsEnum(['yes', 'no'])
  @IsNotEmpty()
  availability: 'yes' | 'no';

  @ApiProperty({
    example: 3000,
    description: 'Price per Event Entertainer Charges',
  })
  @IsNumber()
  pricePerEvent: number;

  @ApiProperty({
    example: 'www.fb.com/raghavThakur',
    description: 'Social Media Link of Entertainer',
  })
  @IsString()
  socialLinks: string;

  @ApiProperty({ example: 'yes', description: 'Vaccinated or Not' })
  @IsEnum(['yes', 'no'])
  vaccinated: 'yes' | 'no';

  @ApiProperty({ example: 'active', description: 'Status of Entertainer' })
  @IsString()
  status: string;
}
