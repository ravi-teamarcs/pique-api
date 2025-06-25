import { PartialType } from '@nestjs/swagger';
import {
  CategorySubcategoryDto,
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
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PerformanceType } from 'src/common/enums/entertainer.enum';

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

class AddressDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  city: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  state: number;

  @IsString()
  @IsOptional()
  zipCode: string;

  @IsString()
  @IsOptional()
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2: string;
}
class socialLinksDto {
  @IsOptional()
  socialLinks?: Record<string, string>;
}

class GeneralInformationDto {
  @IsString()
  @IsOptional()
  entertainerName: string;

  @IsString()
  @IsOptional()
  stageName: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value); // '[2]' => [2]
      } catch {
        return value.split(',').map((v) => Number(v));
      }
    }
    return value;
  })
  @Type(() => Number)
  category: number[];

  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        console.log('Parsed result:', parsed);
        return parsed;
      } catch (e) {
        console.log('Parse error:', e);
        return [];
      }
    }

    return value;
  })
  specific_category: CategorySubcategoryDto[];

  @IsString()
  @IsOptional()
  contactPerson: string;
  @IsString()
  @IsOptional()
  contactNumber: string;

  @IsOptional()
  services: string[];
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  @IsOptional()
  pricePerEvent: number;

  @IsString()
  @IsOptional()
  bio: string;

  @IsString()
  @IsOptional()
  vaccinated: 'yes' | 'no';
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
  AddressDto,
  socialLinksDto,
  GeneralInformationDto,
};
