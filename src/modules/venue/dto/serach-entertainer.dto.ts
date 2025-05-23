import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsNumber, IsArray } from 'class-validator';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Name of the venue', required: false })
  @IsOptional()
  @IsEnum(['yes', 'no'])
  availability: 'yes' | 'no';

  @ApiProperty({
    description: 'Sub_Category of the entertainer',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  sub_category: number;

  @ApiProperty({ description: 'Page Number', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @ApiProperty({
    description: 'Price Range',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    console.log('Received value:', value, 'Type:', typeof value);

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
  @IsArray()
  @IsNumber({}, { each: true }) // Ensure each value in the array is a number
  price?: number[] | null;

  @Transform(({ value }) => {
    console.log('Received value:', value, 'Type:', typeof value);

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

  @ApiProperty({ description: 'city code', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  city: number;
}
