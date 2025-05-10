import { PartialType } from '@nestjs/swagger';
import {
  CreateEntertainerDto,
  Step1Dto,
  Step2Dto,
  Step3Dto,
  Step4Dto,
  Step5Dto,
  Step6Dto,
  Step7Dto,
  Step8Dto,
  Step9Dto,
} from './create-entertainer.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEntertainerDto extends PartialType(CreateEntertainerDto) {}

class UpdateStep1Dto extends PartialType(Step1Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep2Dto extends PartialType(Step2Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep3Dto extends PartialType(Step3Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep4Dto extends PartialType(Step4Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep5Dto extends PartialType(Step5Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep6Dto extends PartialType(Step6Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep7Dto extends PartialType(Step7Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep8Dto extends PartialType(Step8Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}
class UpdateStep9Dto extends PartialType(Step9Dto) {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  step: number;
}

export {
  UpdateStep1Dto,
  UpdateStep2Dto,
  UpdateStep3Dto,
  UpdateStep4Dto,
  UpdateStep5Dto,
  UpdateStep6Dto,
  UpdateStep7Dto,
  UpdateStep8Dto,
  UpdateStep9Dto,
};
