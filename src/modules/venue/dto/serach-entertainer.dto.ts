import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Name of the venue', required: false })
  @IsEnum(['yes', 'no'])
  availability: 'yes' | 'no';

  @ApiProperty({ description: 'Category of the entertainer', required: false })
  @IsOptional()
  category: string;

  @ApiProperty({ description: 'Page Number', required: false })
  @IsOptional()
  @IsNumber()
  page: number;

  @ApiProperty({
    description: 'Global search across multiple fields',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  search: string;

  @ApiProperty({ description: 'Records per page you want .', required: false })
  @IsOptional()
  @IsNumber()
  pageSize: number;
}
