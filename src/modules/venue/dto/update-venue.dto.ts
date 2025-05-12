import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto';
class UpdateNeighbourhoodDto {
  name: string;
  contactPerson: string;
  contactNumber: string;
}
export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class UpdateVenueRequest {
  venue?: UpdateVenueDto;
  neighbourhood?: UpdateNeighbourhoodDto[];
}
