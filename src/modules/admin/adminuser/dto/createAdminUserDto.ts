import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEmail()
  contact: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  role: string; 

  
}
