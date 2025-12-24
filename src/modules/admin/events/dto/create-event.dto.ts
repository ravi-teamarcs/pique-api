import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsDate,
  IsOptional,
  IsInt,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
export class CategorySubcategoryDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsInt()
  categoryId: number;

  @ApiProperty({
    example: [2, 3],
    description: 'Subcategory IDs under this category',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  subCategoryIds: number[];
}
export class CreateEventDto {
  @ApiProperty({ example: 1, description: 'Venue for  which event is created' })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  venueId: number;

  @ApiProperty({
    example: 'singing concert',
    description: 'Title of the event',
  })
  @IsOptional()
  @IsString()
  title: string;

  @ApiProperty({
    example: '2025-02-13T14:30:00Z',
    description: 'Start dateTime of the event',
  })
  @IsString()
  @IsNotEmpty()
  eventStartDateTime: string;

  @IsString()
  @IsNotEmpty()
  eventEndDateTime: string;

  @ApiProperty({ description: 'Description of event' })
  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  neighbourhoodId: number;

  @IsArray()
  @ArrayNotEmpty()
  categories: CategorySubcategoryDto[];
}
