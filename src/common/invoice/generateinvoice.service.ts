import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { log } from 'console';
import { Entertainer } from 'src/modules/admin/entertainer/Entitiy/entertainer.entity';
import { Event } from 'src/modules/admin/events/Entity/event.entity';
import {
  Invoice,
  InvoiceStatus,
  UserType,
} from 'src/modules/admin/invoice/Entity/invoices.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Repository, Between } from 'typeorm';

@Injectable()
export class GenerateInvoiceService {
  private readonly logger = new Logger(GenerateInvoiceService.name);

  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Entertainer)
    private entertainerRepo: Repository<Entertainer>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
  ) {}

  //@Cron(CronExpression.EVERY_MINUTE)
  async generateInvoices() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch events that are confirmed and within the current month
    const events = await this.eventRepo.find({
      where: {
        status: 'confirmed',
        startTime: Between(firstDayOfMonth, lastDayOfMonth),
      },
    });

    for (const event of events) {
      const existingInvoice = await this.invoiceRepo.findOne({
        where: { event_id: event.id },
      });

      if (!existingInvoice) {
        await this.createInvoice(event);
      }
    }
  }

  async createInvoice(event: Event) {
    const today = new Date();
    const eventDate = new Date(event.startTime);
    const isSameMonth = today.getMonth() === eventDate.getMonth();

    const issueDate = isSameMonth
      ? today
      : new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);  // Default 30-day due date

    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.eventId = :eventId', { eventId: event.id })
      .select('booking.entertainerUserId as eId')
      .getRawMany();

    for (const booking of bookings) {
      // Process sequentially instead of in parallel
      const entertainer = await this.entertainerRepo.findOne({
        where: { user: booking.eId },
      });
      const taxRate = 10.0;

      const taxAmount = (entertainer.pricePerEvent * taxRate) / 100;
      const totalWithTax = entertainer.pricePerEvent + taxAmount;

      // Get the latest invoice (ensure sequential number generation)
      const lastInvoice = await this.invoiceRepo
        .createQueryBuilder('invoices')
        .orderBy('invoices.id', 'DESC')
        .limit(1)
        .getOne();

      const lastInvoiceNumber = lastInvoice
        ? parseInt(lastInvoice.invoice_number.split('-')[1])
        : 1000;
      const newInvoiceNumber = `INV-${lastInvoiceNumber + 1}`;

      const newInvoice = this.invoiceRepo.create({
        invoice_number: newInvoiceNumber,
        entertainer_id: Number(entertainer.id),
        venue_id: Number(event.venueId),
        event_id: Number(event.id),
        user_type: UserType.ENTERTAINER,
        issue_date: new Date(issueDate).toISOString().split('T')[0],
        due_date: new Date(dueDate).toISOString().split('T')[0],
        total_amount: parseFloat(entertainer.pricePerEvent.toFixed(2)),
        tax_rate: parseFloat(taxRate.toFixed(2)),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total_with_tax: parseFloat(totalWithTax.toFixed(2)),
        status: InvoiceStatus.PENDING,
        payment_method: '',
        payment_date: null,
      });

      await this.invoiceRepo.save(newInvoice);
    }
  }
}
