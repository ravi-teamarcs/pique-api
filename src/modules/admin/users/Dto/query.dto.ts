import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

class ApprovalQuery {
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

  @ApiProperty({ description: 'Rele ' })
  @IsString()
  @IsIn(['venue', 'entertainer'])
  @IsOptional()
  role?: string;
}

export { ApprovalQuery };
