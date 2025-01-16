import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateEntertainerDto {
  @ApiProperty({ description: 'Name of the entertainer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Expertise of the entertainer' })
  @IsString()
  @IsNotEmpty()
  expertise: string;

  @ApiProperty({ description: 'Availability schedule of the entertainer' })
  @IsString()
  @IsNotEmpty()
  availability: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  userId: number; // Reference to the user
}
