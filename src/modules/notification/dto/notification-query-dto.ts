import {
  IsOptional,
  IsString,
  IsNumberString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  unread?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pageSize: number;
}
