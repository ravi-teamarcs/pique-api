import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { InvoiceDto } from './dto/create-invoice.dto';
import { Invoice } from '../admin/invoice/Entity/invoices.entity';
import { InvoiceStatus } from 'src/common/enums/invoice.enum';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Invoice)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async generateInvoice(userId: number) {
    console.log('Inside generate invoice');
    const bookingId = 2;

    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.eventId', 'event') // Proper way to join relations in TypeORM
      .leftJoin('booking.venueUser', 'venueUser') // Joining the venueUser relation
      .where('booking.id = :bookingId', { bookingId }) // First condition
      .andWhere('venueUser.id = :userId', { userId })
      .andWhere('booking.status = :status', { status: 'completed' })
      .select(['booking.id AS id']) // Access venueUser's ID correctly
      .getRawOne();

    console.log('Booking', booking);
    // Used Here So That Invoice Number is Unique.
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .orderBy('invoices.id', 'DESC')
      .limit(1)
      .getOne();

    // checks last invoice number and  increment it by one.
    const lastInvoiceNumber = lastInvoice
      ? parseInt(lastInvoice.invoice_number.split('-')[1])
      : 1000;

    const newInvoiceNumber = `INV-${lastInvoiceNumber + 1}`;

    console.log('New Invoice Number', newInvoiceNumber);
    // const newInvoice = this.invoiceRepository.create({
    //   invoice_number: newInvoiceNumber,
    //   user_id: userId,
    //   event_id: Number(event.id),
    //   issue_date: new Date(issueDate).toISOString().split('T')[0],
    //   due_date: new Date(dueDate).toISOString().split('T')[0],
    //   total_amount: parseFloat(entertainer.pricePerEvent.toFixed(2)),
    //   tax_rate: parseFloat(taxRate.toFixed(2)),
    //   tax_amount: parseFloat(taxAmount.toFixed(2)),
    //   total_with_tax: parseFloat(totalWithTax.toFixed(2)),
    //   status: InvoiceStatus.PENDING,
    //   payment_method: '',
    //   payment_date: null,
    // });

    // await this.invoiceRepository.save(newInvoice);

    return { message: 'Invoice generated Successfully', status: true };
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
