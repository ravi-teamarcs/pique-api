import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateStatusDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
