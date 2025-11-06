import { IsNumber, IsOptional, IsString } from 'class-validator';

class SeriesQueryDto {
  @IsNumber()
  @IsOptional()
  page: number;
  @IsNumber()
  @IsOptional()
  pageSize: number;
  @IsString()
  @IsOptional()
  search: string;
}

export { SeriesQueryDto };
