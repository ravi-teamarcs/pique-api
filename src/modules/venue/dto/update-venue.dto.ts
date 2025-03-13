import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
export class UpdateVenueDto extends PartialType(CreateVenueDto) {
  @IsNotEmpty()
  @IsNumber()
  venueId: number; //
}
