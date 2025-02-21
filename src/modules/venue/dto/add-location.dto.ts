import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class VenueLocationDto {
  @ApiProperty({ example: '7807446069', description: 'Phone of the Venue' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'radissonblu@gmail.com',
    description: 'Email of the Venue',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '6 lane yellow street',
    description: 'Address Line 1of the Venue',
  })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({
    example: 'kolkata',
    description: 'Address Line2  of the Venue',
  })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 23, description: 'Venue City' })
  @IsNumber()
  @IsNotEmpty()
  city: number;

  @ApiProperty({ example: 43, description: 'Venue State' })
  @IsNumber()
  @IsNotEmpty()
  state: number;

  @ApiProperty({ example: '205675', description: 'Zip code ' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 101, description: 'country' })
  @IsNumber()
  @IsNotEmpty()
  country: number;
}
