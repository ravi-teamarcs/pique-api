import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  parentId?: number;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}
