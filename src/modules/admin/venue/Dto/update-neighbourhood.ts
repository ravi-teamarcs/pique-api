// update-neighbourhood.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateNeighbourhoodDto } from './create-neighbourhood.dto';

export class UpdateNeighbourhoodDto extends PartialType(
  CreateNeighbourhoodDto,
) {}
