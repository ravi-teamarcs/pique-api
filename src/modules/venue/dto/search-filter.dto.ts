import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

class Data {
  @ApiProperty({ description: 'Booking Id ' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  category?: number;
}

export { Data };
