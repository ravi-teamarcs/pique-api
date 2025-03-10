import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';

export class BookingQueryDto {
  @ApiProperty({ description: 'Page Number', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @ApiProperty({ description: 'Status of Booking', required: false })
  @IsOptional()
  @IsEnum([
    'pending',
    'cancelled',
    'rejected',
    'accepted',
    'rescheduled',
    'completed',
    'confirmed',
  ])
  status:
    | 'pending'
    | 'cancelled'
    | 'rejected'
    | 'accepted'
    | 'rescheduled'
    | 'completed'
    | 'confirmed';

  @ApiProperty({ description: 'Records per page you want .', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pageSize: number;
}
