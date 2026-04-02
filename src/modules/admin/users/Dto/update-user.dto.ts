import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  id: number;

  @IsObject()
  fieldsToUpdate: Partial<Record<string, any>>;
}
