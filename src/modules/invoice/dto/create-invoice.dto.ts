import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InvoiceDto {
  @ApiProperty({ description: 'Invoice Number' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ description: 'Name of the entertainer' })
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @ApiProperty({ description: 'Name of the entertainer' })
  @IsNumber()
  @IsOptional()
  bookingId?: number;

  @ApiProperty({ description: 'Total Amount' })
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty({ description: 'Discount' })
  @IsNumber()
  @IsOptional()
  discount: number;

  @ApiProperty({ description: 'Tax' })
  @IsNumber()
  @IsNotEmpty()
  taxAmount: number;

  @ApiProperty({ description: 'grand Total' })
  @IsNumber()
  @IsNotEmpty()
  grandTotal: number;

  @ApiProperty({ description: 'Payment Status of Invoice' })
  @IsString()
  @IsNotEmpty()
  paymentStatus: 'pending' | 'paid' | 'partial' | 'overdue';

  @ApiProperty({ description: 'Date on which invoice is generated' })
  @IsDate()
  @IsNotEmpty()
  issuedDate: Date;
  @ApiProperty({ description: 'Due Date  of Invoice' })
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;
}
