import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/auth.enum';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Phone Number of User',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password of the user (min length 6)',
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Role of the user',
    example: 'venue',
    enum: UserRole,
    required: true,
  })
  @IsEnum(UserRole) // Use the Enum instead of an array
  @IsNotEmpty()
  role: UserRole;
}

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password of the user' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
