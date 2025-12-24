import { PartialType } from '@nestjs/swagger';
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

export class UpdateNeighbourhoodDto extends PartialType(NeighbourhoodDto) {}
