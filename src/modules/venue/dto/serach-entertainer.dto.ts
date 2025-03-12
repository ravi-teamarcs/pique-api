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

    if (typeof value === 'string') {
      return value.split(',').map((num) => Number(num.trim()));
    }

    if (Array.isArray(value)) {
      return value.map((num) => Number(num)); // Ensure array elements are numbers
    }

    return undefined; // Ensures validation still works correctly if value is missing
  })
  @IsArray()
  @IsNumber({}, { each: true }) // Ensure each value in the array is a number
  price?: number[];

  @Transform(({ value }) => {
    console.log('Received value:', value, 'Type:', typeof value);

    if (typeof value === 'string') {
      return value.split(',').map((num) => Number(num.trim()));
    }

    if (Array.isArray(value)) {
      return value.map((num) => Number(num)); // Ensure array elements are numbers
    }

    return undefined; // Ensures validation still works correctly if value is missing
  })
  @IsOptional()
  @IsNumber({}, { each: true }) // Ensure each value in the array is a number
  category?: number[];

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
