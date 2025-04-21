import { PartialType } from '@nestjs/swagger';
import { PrimaryInfoDto } from './primary-info.dto';
export class UpdatePrimaryInfoDtoDto extends PartialType(PrimaryInfoDto) {}

