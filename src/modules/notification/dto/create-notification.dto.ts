import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class NotificationDto {
  @ApiProperty({ description: 'Name of the venue' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Id of the venue' })
  @IsNumber()
  @IsNotEmpty()
  venueId: number;
  @ApiProperty({ description: 'Id of the Entertainer' })
  @IsNumber()
  @IsNotEmpty()
  entertainerId: number;
}
