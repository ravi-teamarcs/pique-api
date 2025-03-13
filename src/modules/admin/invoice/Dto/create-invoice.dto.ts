import { IsEnum, IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';
import { InvoiceStatus, UserType } from '../Entity/invoices.entity';

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
  issue_date: string;

  @IsDateString()
  @IsNotEmpty()
  due_date: string;

  @IsString()
  @IsNotEmpty()
  total_amount: string;

  @IsString()
  @IsNotEmpty()
  tax_rate: string;

  @IsString()
  @IsNotEmpty()
  tax_amount: string;

  @IsString()
  @IsNotEmpty()
  total_with_tax: string;

  @IsEnum(InvoiceStatus)
  @IsNotEmpty()
  status: InvoiceStatus;

  @IsString()
  payment_method: string;

  @IsOptional()
  @IsDateString()
  payment_date?: string;
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
