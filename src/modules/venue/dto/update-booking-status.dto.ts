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
  @IsIn(['cancelled', 'confirmed'])
  status: 'cancelled' | 'confirmed';

  // @IsNumber()
  // @IsNotEmpty()
  // eventId: number;
}
