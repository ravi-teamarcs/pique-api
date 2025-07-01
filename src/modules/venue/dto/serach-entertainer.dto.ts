import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsString,
  IsBoolean,
} from 'class-validator';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Page Number', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @ApiProperty({
    description: 'Price Range',
    required: false,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() !== '') {
      return value
        .split(',')
        .map((num) => num.trim()) // Trim spaces
        .filter((num) => !isNaN(Number(num))) // Remove non-numeric values
        .map(Number); // Convert to numbers
    }

    if (Array.isArray(value)) {
      return value
        .map((num) => Number(num)) // Convert array elements to numbers
        .filter((num) => !isNaN(num)); // Ensure no NaN values
    }

    return value === null ? null : undefined; // Keep null as null, and ignore undefined
  })
  @IsOptional()
  @IsArray() // Ensure it's an array
  @IsNumber({}, { each: true }) // Ensure each element is a number
  category?: number[] | null;

  @ApiProperty({ description: 'Records per page you want .', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pageSize: number;

  @ApiProperty({ description: 'state,123', required: false })
  @IsOptional()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Country Id', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  country: number;

  @IsOptional()
  @IsString()
  vaccinated: 'yes' | 'no';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value; // Let @IsBoolean handle invalid cases
  })
  @IsBoolean()
  isNearby?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  radius?: number;

  @IsOptional()
  @IsString()
  startDateTime: string;

  @IsOptional()
  endDateTime: string;
}
