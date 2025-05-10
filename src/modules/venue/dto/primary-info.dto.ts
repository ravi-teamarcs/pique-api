import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class PrimaryInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsOptional()
  description: string;
}

export { PrimaryInfoDto };
