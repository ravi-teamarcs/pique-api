import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ReqBookingDto {
  @ApiProperty({
    description: 'The person who is approving the request',
    enum: ['admin', 'entertainer'], // Fixed typo here
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['admin', 'entertainer']) // Ensures only valid values are allowed
  approverType: 'admin' | 'entertainer';

  @ApiProperty({ description: 'The approver Id' })
  @IsNumber()
  @IsNotEmpty()
  approverId: number;

  @ApiProperty({ description: 'Response true or false' })
  @IsNumber()
  @IsNotEmpty()
  response: boolean;
}
