import { IsNumber, IsOptional, IsString } from 'class-validator';

class SeriesQueryDto {
  @IsNumber()
  @IsOptional()
  page: number;
  @IsNumber()
  pageSize: number;
  @IsString()
  search: string;
}

export {SeriesQueryDto}
