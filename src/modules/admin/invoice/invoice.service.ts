import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice, InvoiceStatus, UserType } from './entities/invoices.entity';
import { Like, Repository } from 'typeorm';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { InvoiceQueryDto } from './Dto/invoice-query.dto';
import { Booking } from '../booking/entities/booking.entity';
import { differenceInMinutes, format, parse } from 'date-fns';
import { loadEmailTemplate } from 'src/common/email-templates/utils/email.utils';
import { EmailService } from 'src/modules/Email/email.service';
// import * as pdf from 'html-pdf-node';
import * as pdf from 'html-pdf';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly emailService: EmailService,
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
      message: 'Invoices fetched successfully',
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      status: true,
    };
  }

  // Get a specific invoice by ID
  async findOne(id: number) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      message: 'Invoice fetched successfully',
      data: invoice,
      status: true,
    };
  }

  // Update an existing invoice
  async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<any> {}

  // Delete an invoice
  async remove(id: number) {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    await this.invoiceRepository.delete(id);
    return {
      message: 'Invoice deleted successfully',
      status: true,
    };
  }

  // Get invoices by user type (entertainer or venue)
  async findByUserType(userType: UserType): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { user_type: userType },
    });
  }

  // Latest Code of Generate Invoive (@Bhawani Thakur)
  async generateInvoice(dto: CreateInvoiceDto) {
    const { eventId, pricePerHour, platformFee, isFixed, discountInPercent } =
      dto;
    try {
      const { venueId, eventStartTime, eventEndTime, eventName } =
        await this.eventRepository
          .createQueryBuilder('event')
          .select([
            'event.id AS eventId',
            'event.startTime AS eventStartTime',
            'event.endTime AS eventEndTime',
            'event.title AS eventName',
            'event.venueId AS venueId',
          ])
          .where('event.id = :eventId', { eventId })
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
      // Logic to calculate the total amount based on the booking details

      const durationInHours = this.getDurationInHours(
        eventStartTime,
        eventEndTime,
      ); // (duartion)
      const totalAmount = this.roundToTwo(pricePerHour * durationInHours);

      const discountAmount = this.roundToTwo(
        (totalAmount * discountInPercent) / 100,
      );
      const discountedTotal = this.roundToTwo(totalAmount - discountAmount);

      let totalWithPlatformFee = 0;

      if (isFixed) {
        totalWithPlatformFee = this.roundToTwo(discountedTotal + platformFee);
      } else {
        totalWithPlatformFee = this.roundToTwo(
          discountedTotal + (discountedTotal * platformFee) / 100,
        );
      }

      // Invoice Generated On and Due Date
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 60);

      const newInvoice = this.invoiceRepository.create({
        invoice_number: newInvoiceNumber,
        user_id: Number(venueId),
        user_type: UserType.VENUE,
        event_id: Number(eventId),
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: new Date(dueDate).toISOString().split('T')[0],
        total_amount: totalAmount,
        tax_rate: 0,
        tax_amount: parseFloat(discountedTotal.toFixed(2)),
        total_with_tax: parseFloat(totalWithPlatformFee.toFixed(2)),
        status: InvoiceStatus.UNPAID,
        payment_method: '',
        payment_date: null,
        booking_id: null,
      });

      await this.invoiceRepository.save(newInvoice);
      return {
        message: 'Invoice generated successfully',
        data: newInvoice,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  // send Invoice
  async sendInvoice(id: number) {
    console.log('send invoice called');
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('users', 'user', 'user.id = venue.userId')
      .leftJoin('event', 'event', 'event.id = invoices.event_id')
      .select([
        'invoices.invoice_number AS invoiceNumber',
        'invoices.issue_date AS issueDate',
        'invoices.due_date AS dueDate',
        'invoices.total_amount AS totalAmount',
        'invoices.tax_rate AS taxRate',
        'invoices.tax_amount AS taxAmount',
        'invoices.total_with_tax AS totalWithTax',
        'venue.name AS venueName',
        'user.email AS userEmail',
        'event.title AS eventName',
        'event.description AS description',
        'event.eventDate AS eventDate',
      ])
      .where('invoices.id = :id', { id })
      .getRawOne();

    if (!invoice) {
      throw new NotFoundException({ message: 'Invoice not found' });
    }

    try {
      const invoicePayload = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: format(invoice.issueDate, 'd MMMM yyyy'),
        dueDate: format(invoice.dueDate, 'd MMMM yyyy'),
        totalAmount: invoice.totalAmount,
        totalWithTax: invoice.totalWithTax,
        venueName: invoice.venueName,
        venueEmail: invoice.userEmail,
        eventName: invoice.eventName,
        description: invoice.description,
      };
      const html = loadEmailTemplate('invoice.html', invoicePayload);
      console.log('Before Calling pdf fn ');
      const buffer = await this.generatePDF(html);
      // Convert HTML to PDF buffer using Puppeteer
      // const buffer = Buffer.from(pdfBuffer); // Ensure it's a Node.js Buffer
      console.log('Buffer ', buffer);
      const emailPayload = {
        to: invoice.userEmail,
        subject: 'Invoice For Event',
        templateName: 'invoice-email.html',
        replacements: {
          eventDate: format(invoice.eventDate, 'd MMMM yyyy'),
          venueName: invoice.venueName,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          evevntName: invoice.eventName,
        },
        attachments: [
          {
            filename: `${invoice.eventName}_invoice.pdf`,
            content: buffer, // a Buffer from Puppeteer
            contentType: 'application/pdf',
          },
        ],
      };
      await this.emailService.handleSendEmail(emailPayload);
      console.log('Email sent successfully', emailPayload);
      return { message: 'Invoice sent Successfully ', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }

  private getDurationInHours(startTime: string, endTime: string): number {
    const today = new Date().toISOString().split('T')[0]; // get current date as "YYYY-MM-DD"
    const start = parse(
      `${today} ${startTime}`,
      'yyyy-MM-dd HH:mm:ss',
      new Date(),
    );
    const end = parse(`${today} ${endTime}`, 'yyyy-MM-dd HH:mm:ss', new Date());

    const diffInMinutes = differenceInMinutes(end, start);
    const diffInHours = Math.round((diffInMinutes / 60) * 100) / 100; // returns a number with 2 decimals

    return diffInHours;
  }

  private async generatePDF(htmlContent): Promise<Buffer> {
    console.log('HTML Content');
    // const file = { content: htmlContent };
    // const options = { format: 'A3' };
    // const pdfBuffer = await pdf.generatePdf(file, options);
    // console.log('PDF Buffer Inside Fn', pdfBuffer);
    // // Save to disk or attach to email
    // return pdfBuffer;

    const options = { format: 'A3' };
    return new Promise((resolve, reject) => {
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) return reject(err);
        resolve(buffer);
      });
    });
  }

  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }
}
