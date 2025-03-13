import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Column } from 'typeorm';

export class UpdateStatusDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  status: 'active' | 'inactive' | 'pending';
}
