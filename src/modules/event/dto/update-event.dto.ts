import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsNumber()
  eventId: number; //  //  Update eventId in the request body.

  @IsOptional()
  @IsString()
  title: string;
  // Use IsDateString to ensure that the date is in the correct 'YYYY-MM-DD' format
  @IsOptional()
  @IsString()
  date: string;

  // Use IsString for time field and ensure it's in the correct 'HH:MM:SS' format

  @IsOptional()
  @IsString()
  time: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type: string;
}
