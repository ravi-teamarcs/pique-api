import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;
  @IsIn(['active', 'pending', 'inactive'])
  @IsString()
  @IsNotEmpty()
  status: 'active' | 'pending' | 'inactive';
}
