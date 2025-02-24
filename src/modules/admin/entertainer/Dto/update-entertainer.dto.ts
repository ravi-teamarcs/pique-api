import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class UpdateEntertainerDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsObject()
  @IsNotEmpty()
  fieldsToUpdate: Record<string, any>;
}
