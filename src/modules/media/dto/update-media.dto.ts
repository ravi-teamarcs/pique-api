import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class MediaDto {
  @ApiProperty({example:1 , description: ' Id'})
  @IsNumber()
  @IsOptional()
  venueId?: number;
}
