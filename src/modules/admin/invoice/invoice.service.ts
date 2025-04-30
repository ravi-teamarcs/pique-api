import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice, InvoiceStatus, UserType } from './entities/invoices.entity';
import { Like, Repository } from 'typeorm';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { InvoiceQueryDto } from './Dto/invoice-query.dto';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async findAll(dto: InvoiceQueryDto) {
    const { page = 1, pageSize = 10, search = '', role } = dto;
    const skip = (page - 1) * pageSize;

    const baseQuery = this.invoiceRepository
      .createQueryBuilder('invoices')
      .select(['invoices.*'])
      .where('invoices.user_type = :role', { role });

    if (search) {
      baseQuery.andWhere('LOWER(invoices.invoice_number) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    // Clone the query for count before applying pagination
    const countQuery = baseQuery.clone();

    const records = await baseQuery
      .orderBy('invoices.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getRawMany();

    const total = await countQuery.getCount();

    return {
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get a specific invoice by ID
  async findOne(id: number): Promise<Invoice> {
    return await this.invoiceRepository.findOne({ where: { id } });
  }

  // Update an existing invoice
  async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<any> {
    // const invoice = await this.invoiceRepository.findOne({ where: { id } });
    // if (!invoice) {
    //     throw new Error('Invoice not found');
    // }
    // // Merge existing invoice data with updated values
    // const updatedInvoice = { ...invoice, ...updateInvoiceDto };
    // // Recalculate totals if tax-related fields are updated
    // if (updateInvoiceDto.total_amount || updateInvoiceDto.tax_rate) {
    //     updatedInvoice.total_amount = updateInvoiceDto.total_amount
    //         ? parseFloat(updateInvoiceDto.total_amount)
    //         : invoice.total_amount;
    //     updatedInvoice.tax_rate = updateInvoiceDto.tax_rate
    //         ? parseFloat(updateInvoiceDto.tax_rate)
    //         : invoice.tax_rate;
    //     updatedInvoice.tax_amount = parseFloat(
    //         this.calculateTaxAmount(updatedInvoice.total_amount, updatedInvoice.tax_rate).toFixed(2)
    //     );
    //     updatedInvoice.total_with_tax = parseFloat((updatedInvoice.total_amount + updatedInvoice.tax_amount).toFixed(2));
    // }
    // // Ensure `payment_date` is properly formatted if provided
    // if (updateInvoiceDto.payment_date) {
    //     updatedInvoice.payment_date = new Date(updateInvoiceDto.payment_date).toISOString().split('T')[0];
    // }
    // return await this.invoiceRepository.save(updatedInvoice);
  }

  // Delete an invoice
  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    await this.invoiceRepository.delete(id);
  }

  // Calculate tax amount based on total amount and tax rate
  private calculateTaxAmount(totalAmount: number, taxRate: number): number {
    return (totalAmount * taxRate) / 100;
  }

  // Get invoices by user type (entertainer or venue)
  async findByUserType(userType: UserType): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { user_type: userType },
    });
  }

  // Get invoices by status (pending, paid, overdue)
  async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return await this.invoiceRepository.find({ where: { status } });
  }

  // Update invoice status (e.g., mark as paid)
  async updateStatus(id: number, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = status;
    return await this.invoiceRepository.save(invoice);
  }

  // Latest Code of Generate Invoive (@Bhawani Thakur)
  async generateInvoice(dto: CreateInvoiceDto) {
    const { bookingId } = dto;
    try {
      const booking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .select([
          'booking.eventId AS eventId',
          'booking.entId AS entertainerId',
          'booking.venueId AS venueId',
          'event.startTime AS eventStartTime',
          'event.endTime AS eventEndTime',
          'event.name AS eventName',
        ])
        .getRawOne();

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
      const taxAmount = (10000 * taxRate) / 100;
      const totalWithTax = 1000 + taxAmount;

      // Invoice Generated On and Due Date
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 60);

      const newInvoice = this.invoiceRepository.create({
        invoice_number: newInvoiceNumber,
        user_id: Number(booking.venueId), // can also be generated for admin created entertainer but need to add
        event_id: Number(booking.eventId),
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: new Date(dueDate).toISOString().split('T')[0],
        total_amount: 122,
        tax_rate: parseFloat(taxRate.toFixed(2)),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total_with_tax: parseFloat(totalWithTax.toFixed(2)),
        status: InvoiceStatus.PENDING,
        payment_method: '',
        payment_date: null,
        booking_id: Number(bookingId),
      });
      await this.invoiceRepository.save(newInvoice);
      return { message: 'Invoice generated successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
