import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DownloadReport {
  @ApiProperty({ description: 'From Date  .', required: false })
  @IsOptional()
  @IsString()
  from: string;

  @ApiProperty({ description: 'Till Date .', required: false })
  @IsOptional()
  @IsString()
  to: string;
}
