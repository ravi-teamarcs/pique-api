import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsNumber, IsEnum } from 'class-validator';

export class CreateEntertainerDto {
  @ApiProperty({ description: 'Name of the entertainer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Type  of the entertainer' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Bio of the entertainer' })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({ description: 'Enter the Phone Number of Entertainer' })
  @IsString()
  @IsNotEmpty()
  phone1: string;

  @ApiProperty({
    description: 'Enter the alternative Phone number of Entertainer',
  })
  @IsString()
  @IsNotEmpty()
  phone2: string;

  @ApiProperty({ description: 'Headshot of entertainer' })
  @IsString()
  @IsNotEmpty()
  headshotUrl: string;

  @ApiProperty({ description: 'Medias of the entertainer' })
  @IsString()
  mediaUrl: string;

  @ApiProperty({ description: ' Role of entertainer (soloist , duo , trio)' })
  @IsEnum(['soloist', 'duo', 'trio', 'ensemble'])
  @IsNotEmpty()
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @ApiProperty({ description: 'Availability schedule of the entertainer' })
  @IsEnum(['yes', 'no'])
  @IsNotEmpty()
  availability: 'yes' | 'no';

  @ApiProperty({ description: 'Price per Event Entertainer Charges' })
  @IsNumber()
  pricePerEvent: number;

  @ApiProperty({ description: 'Social Media Link of Entertainer' })
  @IsString()
  socialLinks: string;

  @ApiProperty({ description: 'Vaccinated or Not' })
  @IsEnum(['yes', 'no'])
  vaccinated: 'yes' | 'no';

  @ApiProperty({ description: 'Status of Entertainer' })
  @IsString()
  status: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  userId: number; // Reference to the user
}
