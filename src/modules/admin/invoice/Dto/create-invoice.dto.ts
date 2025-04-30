import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { InvoiceStatus, UserType } from '../entities/invoices.entity';

export class CreateInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @IsNumber()
  @IsNotEmpty()
  pricePerHour: number;

  @IsNumber()
  @IsNotEmpty()
  discountInPercent: number;
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
