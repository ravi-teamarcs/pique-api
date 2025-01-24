import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Repository } from 'typeorm';
import { InvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async generateInvoice(invoiceDto: InvoiceDto) {
    const { customerId, ...invoiceDtoDetails } = invoiceDto;
    const invoice = this.invoiceRepository.create({
      customer: { id: customerId },
      ...invoiceDtoDetails,
    });

    if (!(await this.invoiceRepository.save(invoice))) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }
    


    return { message: 'Invoice generated Successfully', invoice: invoice };
  }

  async findAllInvoice(userId: number): Promise<Invoice[]> {
    const invoice = await this.invoiceRepository.find({
      where: { customer: { id: userId } },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice Not Found');
    }

    return invoice;
  }
}
