import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto, CreateVenueRequestDto } from './create-venue.dto';
export class UpdateVenueDto extends PartialType(CreateVenueRequestDto) {}
