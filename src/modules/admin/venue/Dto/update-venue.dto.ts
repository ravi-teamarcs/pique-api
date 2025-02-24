import { IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateVenueDto {
  @IsOptional()
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsObject()
  fieldsToUpdate: Record<string, any>;
}
