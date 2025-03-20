import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceStatus } from 'src/common/enums/invoice.enum';
import { Booking } from '../booking/entities/booking.entity';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async generateInvoice(userId: number) {
    console.log('Inside generate invoice');
    const bookingId = 2;

    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('users', 'user', 'user.id = booking.entertainerUserId')
      .leftJoin(
        'entertainers',
        'ent',
        'ent.userId = booking.entertainerUserId ',
      ) // Correct join condition
      .where('booking.id = :bookingId', { bookingId })
      .andWhere('booking.status = :status', { status: 'completed' })
      .select([
        'booking.id AS id',
        'user.id AS uid',
        'user.name AS uname',
        'booking.eventId As eventId',
        'ent.pricePerEvent AS pricePerEvent',
      ])
      .getRawOne();

    console.log('Booking', booking);

    const { eventId, uname, uid, id, pricePerEvent } = booking;

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

    const taxRate = 10.0;
    const taxAmount = (pricePerEvent * taxRate) / 100;
    const totalWithTax = pricePerEvent + taxAmount;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 10);

    const newInvoice = this.invoiceRepository.create({
      invoice_number: newInvoiceNumber,
      user_id: userId,
      event_id: Number(eventId),
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: new Date(dueDate).toISOString().split('T')[0],
      total_amount: parseFloat(pricePerEvent.toFixed(2)),
      tax_rate: parseFloat(taxRate.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_with_tax: parseFloat(totalWithTax.toFixed(2)),
      status: InvoiceStatus.PENDING,
      payment_method: '',
      payment_date: null,
    });

    console.log('Invoice Generated', newInvoice);

    // await this.invoiceRepository.save(newInvoice);

    return { message: 'Invoice generated Successfully', status: true };
  }

  async findAllInvoice(userId: number) {
    const invoices = await this.invoiceRepository.find({
      where: { user_id: userId },
    });

    return {
      message: 'Invoice returned Successfully',
      status: true,
      data: invoices,
    };
  }
}
