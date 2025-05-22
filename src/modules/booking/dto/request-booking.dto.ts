import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BookingReqResponse {
  @ApiProperty({ description: 'Response true or false' })
  @IsString()
  @IsNotEmpty()
  response: 'invited' | 'approved' | 'rejected';
}
