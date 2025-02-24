import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateCategoryDto {

  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

}
