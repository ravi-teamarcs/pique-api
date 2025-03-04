import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

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
