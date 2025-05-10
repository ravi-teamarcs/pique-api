import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

class GetEntertainerDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsString()
  @IsOptional()
  search: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pageSize: number;

  @IsOptional()
  @IsString()
  date: string;
  
  @IsOptional()
  @IsIn(['yes', 'no'])
  @IsString()
  vaccinated: string;
}

export { GetEntertainerDto };
