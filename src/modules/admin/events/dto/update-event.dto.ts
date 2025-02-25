import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @ApiProperty({ example: 3, description: 'Unique identifier of the event' })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: 'Venue for which the event is created' })
  @IsOptional()
  @IsNumber()
  venueId?: number;

  @ApiProperty({ example: 28, description: 'User ID of the event creator' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({ example: 'Singing Concert', description: 'Title of the event' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: '2025-02-13T14:30:00Z', description: 'Start dateTime of the event' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ example: '2025-02-13T16:30:00Z', description: 'End dateTime of the event' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ example: 'Noida', description: 'Location of the event' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Description of the event' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'none', description: 'Recurring type of the event' })
  @IsOptional()
  @IsEnum(['none', 'daily', 'weekly', 'monthly'])
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ example: 'scheduled', description: 'Current status of the event' })
  @IsOptional()
  @IsEnum(['pending', 'scheduled', 'confirmed', 'cancelled', 'completed'])
  status?: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @ApiProperty({ example: false, description: 'Is the event creator an admin?' })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
