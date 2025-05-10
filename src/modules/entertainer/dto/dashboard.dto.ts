import { IsNumber, IsOptional } from 'class-validator';

class DashboardDto {
  @IsOptional()
  @IsNumber()
  month: number;
  @IsOptional()
  @IsNumber()
  year: number;
}

export { DashboardDto };
