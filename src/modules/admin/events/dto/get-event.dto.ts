import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetEventDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  pageSize: number;

  @IsString()
  @IsOptional()
  status: string;
}
