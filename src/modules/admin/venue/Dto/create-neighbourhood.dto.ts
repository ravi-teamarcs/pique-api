// create-neighbourhood.dto.ts
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateNeighbourhoodDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  contactPerson: string;

  @IsNotEmpty()
  @IsString()
  contactNumber: string;

  @IsNotEmpty()
  @IsNumber()
  venueId: number;
}
