import { IsArray, IsEnum, IsInt, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  ids: number[];

  @IsEnum(['active', 'inactive', 'pending'], { message: 'Invalid status value' })
  @IsNotEmpty()
  status: 'active' | 'inactive' | 'pending';
}
