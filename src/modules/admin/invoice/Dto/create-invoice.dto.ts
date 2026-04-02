import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { InvoiceStatus, UserType } from '../entities/invoices.entity';
import { Transform } from 'class-transformer';

export class CreateInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  pricePerHour: number;

  @IsNumber()
  @IsOptional()
  discountInPercent: number;

  @IsNumber()
  @IsNotEmpty()
  platformFee: number;

  @IsBoolean()
  @IsNotEmpty()
  isFixed: boolean;
}

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsString()
  @IsOptional()
  total_amount?: string;

  @IsString()
  @IsOptional()
  tax_rate?: string;

  @IsString()
  @IsOptional()
  tax_amount?: string;

  @IsString()
  @IsOptional()
  total_with_tax?: string;

  @IsString()
  @IsOptional()
  payment_method?: string;

  @IsOptional()
  @IsDateString()
  payment_date?: string;
}
