import { PartialType } from '@nestjs/swagger';
import { CreateEntertainerDto } from './create-entertainer.dto';

export class UpdateEntertainerDto extends PartialType(CreateEntertainerDto) {}
