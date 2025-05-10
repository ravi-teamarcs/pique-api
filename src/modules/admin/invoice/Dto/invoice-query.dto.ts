import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  isNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InvoiceQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pageSize: number;

  @IsOptional()
  @IsString()
  search: number;

  @IsNotEmpty()
  @IsString()
  role: string;
}
