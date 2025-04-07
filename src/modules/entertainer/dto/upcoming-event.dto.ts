import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

class UpcomingEventDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page: number;
 
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  pageSize: number;
}

export { UpcomingEventDto };
