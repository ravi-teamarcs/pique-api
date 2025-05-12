import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
class UpdateNeighbourhoodDto {
  name: string;
  contactPerson: string;
  contactNumber: string;
}
export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class UpdateVenueRequest {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (err) {
        throw new BadRequestException('Invalid JSON format for venue');
      }
    }
    return value;
  })
  venue?: UpdateVenueDto;
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (err) {
        throw new BadRequestException('Invalid JSON format for venue');
      }
    }
    return value;
  })
  neighbourhood?: UpdateNeighbourhoodDto[];
}
