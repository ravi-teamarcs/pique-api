import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class Report {
  @ApiProperty({ description: 'Page Number.', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @ApiProperty({ description: 'Records per page you want .', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  limit: number;

  @ApiProperty({ description: 'From Date  .', required: false })
  @IsOptional()
  @IsString()
  from: string;

  @ApiProperty({ description: 'Till Date .', required: false })
  @IsOptional()
  @IsString()
  to: string;
}
