import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class EventsQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  pageSize: number;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  status: 'unpublished' | 'completed' | 'scheduled' | 'confirmed' | 'cancelled';
}
