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
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // Invoice generation Logic for Entertainer
  async generateInvoice(userId: number) {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('users', 'user', 'user.id = booking.entertainerUserId')
      .leftJoin('entertainers', 'ent', 'ent.userId = booking.entertainerUserId')
      .where('booking.entertainerUserId = :userId', { userId })
      .andWhere('booking.status = :status', { status: 'completed' })
      .andWhere('booking.startTime BETWEEN :start AND :end', { start, end }) // 👈 this is your main filter
      .select([
        'booking.id AS id',
        'booking.eventId AS eventId',
        'user.id AS uid',
        'user.name AS uname',
        'ent.pricePerEvent AS pricePerEvent',
      ])
      .getRawMany();

    for (const booking of bookings) {
      const { id: bookingId, eventId, uid, uname, pricePerEvent } = booking;

      const alreadyGenerated = await this.invoiceRepository.findOne({
        where: {
          user_id: userId,
          // booking_id: bookingId, // ✅ prevent duplicate invoice for same booking
        },
      });

      if (alreadyGenerated) continue;

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
        entertainer_id: 1,
        venue_id: 1,
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
      await this.invoiceRepository.save(newInvoice);
    }

    return { message: 'Invoices generated Successfully', status: true };
  }
  // Fetch All Invoices for Entertainer
  async findAllInvoice(userId: number) {
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('event', 'event', 'invoices.event_id = event.id')
      .where('invoices.user_id = :userId', { userId })
      .select([
        'invoices.id AS id ',
        'invoices.invoice_number AS invoice_number',
        'invoices.user_id AS user_id',
        'invoices.event_id AS event_id',
        'invoices.user_type AS user_type',
        'invoices.issue_date AS issue_date',
        'invoices.due_date AS due_date',
        'invoices.total_amount AS total_amount',

        'invoices.tax_rate AS tax_rate',
        'invoices.tax_amount AS tax_amount',
        'invoices.total_with_tax AS total_with_tax',
        'invoices.status AS status',
        'invoices.payment_method AS payment_method',
        'invoices.payment_date AS payment_date',
        'event.id',
        'event.title',
        'event.location',
      ])
      .getRawMany(); // Use getRawMany if you're not using relations

    return {
      message: 'Invoice returned Successfully',
      status: true,
      data: invoices,
    };
  }
}
