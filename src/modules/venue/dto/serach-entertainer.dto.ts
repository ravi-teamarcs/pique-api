import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Name of the venue' })
  @IsEnum(['yes', 'no'])
  availability: 'yes' | 'no';

  @ApiProperty({ description: 'Type of the entertainer' })
  @IsOptional()
  type: string;

  @ApiProperty({ description: 'Page Number' })
  @IsOptional()
  @IsNumber()
  page: number;

  @ApiProperty({ description: 'Global search across multiple fields' })
  @IsOptional()
  @IsNumber()
  search: string;

  @ApiProperty({ description: 'Records per page you want .' })
  @IsOptional()
  @IsNumber()
  pageSize: number;
}
