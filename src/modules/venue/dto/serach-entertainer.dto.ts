import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsNumber, IsObject } from 'class-validator';
import { SortField, SortOrder } from 'src/common/types/venue.type';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Name of the venue', required: false })
  @IsOptional()
  @IsEnum(['yes', 'no'])
  availability: 'yes' | 'no';

  @ApiProperty({ description: 'Category of the entertainer', required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  category: number;

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
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value); // Convert string to object
      } catch {
        return null; // Return null if parsing fails
      }
    }
    return value; // If it's already an object, return as-is
  })
  price?: { min: number; max: number };

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value); // Convert string to object
    } catch (error) {
      return null; // Handle invalid JSON gracefully
    }
  })
  sort?: { sortBy: SortField; order: SortOrder };

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
