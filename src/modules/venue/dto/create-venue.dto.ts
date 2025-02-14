import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUrl,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Radisson Blu', description: 'Name of the Venue' })
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiProperty({
    example: 'A 100 years old legacy',
    description: 'Descritpion Line2  of the Venue',
  })
  @IsString()
  @IsOptional()
  description?: string;

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
  @ApiProperty({ example: 101.34, description: 'longitude' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 43.553, description: 'latitude' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  long: number;

  @ApiProperty({
    example: ['Ac', 'Wifi', 'Pool'],
    description: 'Amenities available at Venue ',
  })
  @IsOptional()
  amenities?: string[];

  @ApiProperty({
    example: 'www.radiisonBlu.com',
    description: 'Website Url of  Venue ',
  })
  @IsOptional()
  websiteUrl?: string;

  // @ApiProperty({ example: '12:30', description: 'Timings of  Venue ' })
  // @IsString()
  // @IsOptional()
  // timings?: string;

  @ApiProperty({ example: 'yes we have', description: 'Booking Policies' })
  @IsString()
  @IsOptional()
  bookingPolicies?: string;
}
