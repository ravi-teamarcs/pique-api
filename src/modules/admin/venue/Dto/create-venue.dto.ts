import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateVenueDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    addressLine1: string;

    @IsOptional()
    @IsString()
    addressLine2?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    city: number;

    @IsNumber()
    @IsNotEmpty()
    state: number;

    @IsNumber()
    @IsNotEmpty()
    country: number;

    @IsString()
    @IsNotEmpty()
    zipCode: string;



    @IsString()
    @IsNotEmpty()
    lat: string;

    @IsString()
    @IsNotEmpty()
    long: string;

    @IsArray()
    @IsNotEmpty()
    amenities: string[];

    @IsString()
    @IsNotEmpty()
    websiteUrl: string;

    @IsString()
    @IsNotEmpty()
    timings: string;

    @IsString()
    @IsNotEmpty()
    bookingPolicies: string;

    @IsNotEmpty()
    userId: number; // Assuming the venue is linked to a user

    @ApiProperty({ example: true, description: 'Is venue Booking Venue' })
    @IsBoolean()
    isParent: boolean;
  
    @ApiProperty({
      example: 9,
      description: 'Parent venue Id',
    })
    parentId: number | null;
}
