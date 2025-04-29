import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
class BookingQueryDto {
  @ApiProperty({ description: 'Current Page Number ' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number;

  @ApiProperty({ description: 'Record Per Page you Want ' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  pageSize?: number;
  @IsIn(['pending', 'confirmed', 'cancelled', 'rejected', 'accepted'])
  @IsOptional()
  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'rejected'
    | 'accepted'
    | 'completed'
    | 'rescheduled';
}

export { BookingQueryDto };
