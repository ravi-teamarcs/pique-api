import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class SearchEntertainerDto {
  @ApiProperty({ description: 'Name of the venue' })
  @IsEnum(['yes', 'no'])
  @IsNotEmpty()
  availability: 'yes' | 'no';

  @ApiProperty({ description: 'Type of the entertainer' })
  @IsString()
  @IsNotEmpty()
  type: string;
}
