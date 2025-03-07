import { IsOptional, IsNotEmpty, IsObject, IsNumber } from 'class-validator';

export class UpdateVenueDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  fieldsToUpdate: Record<string, any>;
}
