import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UploadMedia {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined)) // Avoid NaN issues
  eventId?: number;
}
