import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Name of the user', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '9876543210',
  })
  @ApiProperty({ description: 'Password of the user', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Role of the user',
    example: 'venue',
    enum: ['venue', 'entertainer'],
  })
  @IsEnum(['venue', 'entertainer'])
  @IsNotEmpty()
  role: 'venue' | 'entertainer';
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  // @ApiProperty({
  //   description: 'Email of the user',
  //   example: 'john.doe@example.com',
  //   required: false,
  // })
  // @IsEmail()
  // @IsOptional()
  // email?: string;

  @ApiProperty({
    description: 'Phone Number of the user',
    example: '9876543210',
    required: false,
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  // @ApiProperty({
  //   description: 'Password of the user',
  //   example: 'password123',
  //   required: false,
  // })
  // @IsString()
  // @IsOptional()
  // password?: string;

  //   @ApiProperty({
  //     description: 'Role of the user',
  //     example: 'venue',
  //     enum: ['venue', 'entertainer'],
  //     required: false,
  //   })
  //   @IsEnum(['venue', 'entertainer'])
  //   @IsOptional()
  //   role?: 'venue' | 'entertainer';
}
