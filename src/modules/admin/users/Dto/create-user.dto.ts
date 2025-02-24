import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 13)
  phoneNumber: string;

  @IsNotEmpty()
  @IsEnum(['venue', 'entertainer'])
  role: 'venue' | 'entertainer';

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: 'active' | 'inactive' | 'pending';
}
