import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UploadMedia {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined)) // Avoid NaN issues
  venueId?: number;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined)) // Avoid NaN issues
  eventId?: number;
}
