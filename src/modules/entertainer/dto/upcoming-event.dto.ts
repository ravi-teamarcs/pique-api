import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status } from 'src/common/enums/event.enum';

class UpcomingEventDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  pageSize: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsEnum(Status, { each: true })
  status?: Status[];

  @IsString()
  @IsOptional()
  search: string;
}

export { UpcomingEventDto };
