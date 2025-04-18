import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @Length(10, 13)
  phoneNumber: string;

  @IsNotEmpty()
  @IsEnum(['venue', 'entertainer'])
  role: 'venue' | 'entertainer';
}
