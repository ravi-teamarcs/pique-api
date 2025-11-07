import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

class SeriesQueryDto {
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
  search: string;
}

export { SeriesQueryDto };
