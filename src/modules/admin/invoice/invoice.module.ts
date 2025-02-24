import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './Entity/invoices.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController]
})
export class InvoiceMod { }
