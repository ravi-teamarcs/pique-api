import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status } from 'src/common/enums/event.enum';

const allowedStatuses = [
  'invited',
  'accepted',
  'completed',
  'confirmed',
  'cancelled',
  'rescheduled',
];
class BookingQueryDto {
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
  @IsIn(allowedStatuses, { each: true })
  status?:
    | 'invited'
    | 'accepted'
    | 'completed'
    | 'confirmed'
    | 'cancelled'
    | 'rescheduled';

  @IsString()
  @IsOptional()
  search: string;
}

export { BookingQueryDto };
