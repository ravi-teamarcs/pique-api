import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Radisson Blu', description: 'Name of the Venue' })
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsNotEmpty()
  addressLine2: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string')
      return value.split(',').map((item) => item.trim());
    return [];
  })
  venueType: string[];

  @ApiProperty({ example: 23, description: 'Venue City' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  city: number;

  @ApiProperty({ example: 43, description: 'Venue State' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  state: number;

  @ApiProperty({ example: '205675', description: 'Zip code ' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 101, description: 'country' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  country: number;

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;
}
