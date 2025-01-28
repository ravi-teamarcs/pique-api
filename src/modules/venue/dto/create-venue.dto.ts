import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUrl,
  IsEmail,
} from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ description: 'Name of the Venue' })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({ description: 'Phone of the Venue' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Email of the Venue' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Address Line 1of the Venue' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({ description: 'Address Line2  of the Venue' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: 'Descritpion Line2  of the Venue' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Venue City' })
  @IsString()
  @IsNotEmpty()
  city: string;
  @ApiProperty({ description: 'Venue State' })
  @IsString()
  @IsNotEmpty()
  state: string;
  @ApiProperty({ description: 'Zip code ' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ description: 'country' })
  @IsString()
  @IsNotEmpty()
  country: string;
  @ApiProperty({ description: 'Latitude' })
  @IsString()
  @IsNotEmpty()
  lat: string;
  @ApiProperty({ description: 'Longitude' })
  @IsString()
  @IsNotEmpty()
  long: string;
  @ApiProperty({ description: 'Amenities available at Venue ' })
  @IsString()
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ description: 'Website Url of  Venue ' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiProperty({ description: 'Timings of  Venue ' })
  @IsString()
  @IsOptional()
  timings?: string;

  @ApiProperty({ description: 'Booking Policies' })
  @IsString()
  @IsOptional()
  bookingPolicies?: string;
}
