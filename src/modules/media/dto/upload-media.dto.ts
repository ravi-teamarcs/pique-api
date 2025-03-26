import { IsNumber, IsOptional } from 'class-validator';

export class UploadMedia {
  @IsNumber()
  @IsOptional()
  venueId: number;
  @IsNumber()
  @IsOptional()
  eventId: number;
}
