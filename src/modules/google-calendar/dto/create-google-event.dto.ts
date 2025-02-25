import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ description: 'Title of the event ' })
  @IsString()
  title: string;
  @ApiProperty({ description: 'description of the event ' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'starting time of the event ' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'starting time of the event ' })
  @IsDateString()
  endTime: string;
}
