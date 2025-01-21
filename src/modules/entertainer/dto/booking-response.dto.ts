import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

class BookingResponseDto {
  @ApiProperty({ description: 'Booking Id' })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({
    description: 'If entertainer has accepted the Booking Request or  Not ',
  })
  @IsNotEmpty()
  isAccepted: 'accepted' | 'rejected';
}

export { BookingResponseDto };
