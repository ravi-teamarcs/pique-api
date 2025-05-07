import { IsNotEmpty, IsString } from 'class-validator';

export class NeighbourhoodDto {
  // @IsString()
  // @IsNotEmpty()
  // name: string;
  @IsString()
  @IsNotEmpty()
  contactPerson: string;
  @IsString()
  @IsNotEmpty()
  contactNumber: string;
}
