import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { InvoiceDto } from './dto/create-invoice.dto';
import { Invoice } from '../admin/invoice/Entity/invoices.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async generateInvoice(invoiceDto: InvoiceDto) {
    const { customerId, ...invoiceDtoDetails } = invoiceDto;
    const invoice = this.invoiceRepository.create({
      // customer: { id: customerId },
      // ...invoiceDtoDetails,
    });

    if (!(await this.invoiceRepository.save(invoice))) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }

    return { message: 'Invoice generated Successfully', invoice: invoice };
  }

  async findAllInvoice(userId: number) {
    console.log(userId, 'Inside get ');
    const invoices = await this.invoiceRepository.find({
      where: { venue_id: userId },
    });

    return {
      message: 'Invoice returned Successfully',
      status: true,
      data: invoices,
    };
  }
}
