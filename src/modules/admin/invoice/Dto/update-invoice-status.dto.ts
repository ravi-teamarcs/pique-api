import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateInvoiceStatus {
  @IsNumber()
  @IsNotEmpty()
  invAmountPaid: number;

  @IsString()
  @IsNotEmpty()
  chequeNo: string;
  @IsString()
  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @IsIn(['paid'])
  @IsNotEmpty()
  status: 'paid';
}
