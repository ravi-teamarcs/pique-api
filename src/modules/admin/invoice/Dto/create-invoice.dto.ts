import { IsEnum, IsNotEmpty, IsNumber, IsString, IsDate, IsOptional, IsDecimal, IsDateString } from 'class-validator';
import { InvoiceStatus, UserType } from '../Entity/invoices.entity';
// Adjust import path accordingly

export class CreateInvoiceDto {



  @IsString()
  @IsNotEmpty()
  invoice_number: string;

  @IsNumber()
  @IsNotEmpty()
  entertainer_id: number;

  @IsNumber()
  @IsNotEmpty()
  event_id: number;

  @IsNumber()
  @IsNotEmpty()
  venue_id: number;

  @IsEnum(UserType)
  @IsNotEmpty()
  user_type: UserType;

  @IsDateString()
  @IsNotEmpty()
  issue_date: string;  // Date string, e.g., "2025-02-11"

  @IsDateString()
  @IsNotEmpty()
  due_date: string;  // Date string, e.g., "2025-02-20"

  @IsDecimal()
  @IsNotEmpty()
  total_amount: string;

  @IsDecimal()
  @IsNotEmpty()
  tax_rate: string;

  @IsDecimal()
  @IsNotEmpty()
  tax_amount: string;

  @IsDecimal()
  @IsNotEmpty()
  total_with_tax: string;

  @IsEnum(InvoiceStatus)
  @IsNotEmpty()
  status: InvoiceStatus;

  @IsString()
  @IsNotEmpty()
  payment_method: string;

  @IsOptional()
  @IsDateString()
  payment_date?: string;  // Optional Date string, e.g., "2025-02-15"
}

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsDecimal()
  @IsOptional()
  total_amount?: number;

  @IsDecimal()
  @IsOptional()
  tax_rate?: number;

  @IsDecimal()
  @IsOptional()
  tax_amount?: number;

  @IsDecimal()
  @IsOptional()
  total_with_tax?: number;

  @IsString()
  @IsOptional()
  payment_method?: string;

  @IsOptional()
  @IsDate()
  payment_date?: string;
}
