import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional } from 'class-validator';

export class GetBooking {
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

  @ApiProperty({ description: 'Booking Id ' })
  @IsNumber()
  @IsIn(['pending ', 'completed', 'accepted', 'rejected', 'rescheduled'])
  @IsOptional()
  status?: string;
}
