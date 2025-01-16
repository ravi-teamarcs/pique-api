import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ description: 'Name of the venue' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Location of the venue' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Contact information of the venue' })
  @IsString()
  @IsOptional()
  contactInfo?: string;
}