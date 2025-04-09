import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/common/enums/event.enum';

class BookingQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  pageSize: number;

  @IsOptional()
  status: 'pending' | 'accepted' | 'completed' | 'confirmed' | 'cancelled';

  @IsString()
  @IsOptional()
  search: string;
}

export { BookingQueryDto };
