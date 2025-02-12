import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsDate } from 'class-validator';

export class GoogleTokenDto {
 
  @ApiProperty({ example: 1, description: 'User ID associated with the token' })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: 'ya29.a0AfH6...',
    description: 'Google access token',
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiProperty({ example: '1//0gXhV2...', description: 'Google refresh token' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @ApiProperty({
    example: '2025-12-10T12:00:00Z',
    description: 'Token expiration date',
  })
  @IsNotEmpty()
  @IsDate()
  expiresAt: Date;
}
