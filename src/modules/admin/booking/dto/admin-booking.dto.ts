import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class EntertainerCategoryDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsInt()
  categoryId: number;

  @ApiProperty({
    example: [1, 2],
    description: 'List of Subcategory IDs under this category',
  })
  @IsArray()
  subCategoryIds: number[];
}

export class EntertainerCategoriesDto {
  @ApiProperty({ example: 10, description: 'Entertainer ID' })
  @IsInt()
  entertainerId: number;

  @ApiProperty({
    type: [EntertainerCategoryDto],
    description: 'Categories and subcategories assigned to this entertainer',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerCategoryDto)
  categories: EntertainerCategoryDto[];
}
class AdminBookingDto {
  @IsString()
  @IsNotEmpty()
  showStartDateTime: string;

  @ApiProperty({
    example: 'Please be on time',
    description: 'Special Notes for the Booking',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialNotes?: string;

  @ApiProperty({
    example: 'duo',
    description: 'Role of entertainer (soloist, duo, trio, ensemble)',
  })
  @ApiProperty({ example: 1, description: 'Reference to the Venue' })
  @IsNumber()
  @IsNotEmpty()
  venueId: number;

  @ApiProperty({ example: 1, description: 'Reference to the Entertainers' })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntertainerCategoriesDto)
  entertainers: EntertainerCategoriesDto[];

  @ApiProperty({
    example: 1,
    description: 'Event id for which booking is created.',
  })
  @IsNumber()
  @IsNotEmpty()
  eventId: number;
}
export { AdminBookingDto };
