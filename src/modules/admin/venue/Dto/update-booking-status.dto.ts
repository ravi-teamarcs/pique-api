// dto/update-venue-booking-status.dto.ts
import {
  IsArray,
  IsIn,
  IsString,
  ArrayNotEmpty,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class UpdateBookingStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  bookingIds: number[];

  @IsString()
  @IsIn(['canceled', 'confirmed'])
  status: 'canceled' | 'confirmed';

  @IsNumber()
  @IsNotEmpty()
  eventId: number;
}
