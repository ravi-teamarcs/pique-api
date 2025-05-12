import {
  BadRequestException,
  HttpException,
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
import { UpdateInvoiceStatus } from './Dto/update-invoice-status.dto';
import { paymentsresellersubscription } from 'googleapis/build/src/apis/paymentsresellersubscription';

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
      .leftJoin('event', 'event', 'event.id = invoices.event_id')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')
      .select([
        'invoices.*',
        'event.id AS eventId',
        'event.slug AS eventSlug',
        // venue Info
        'venue.name AS venueName',
        'venue.addressLine1 AS venueAddressLine1',
        'venue.addressLine2 AS venueAddressLine2',
        'venue.contactPerson As contactPerson',
        'venue.contactNumber As contactNumber',
        'state.name AS stateName',
        'city.name AS cityName',
        'code.stateCode AS StateCode',
        // Neighbourhood Info
        'hood.name AS neighbourhoodName',
        'hood.contactPerson AS neighbourhoodContactPerson',
        'hood.contactNumber AS neighbourhoodContactNumber',
      ])
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
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('countries', 'country', 'country.id = venue.country')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
      .leftJoin('event', 'event', 'event.id = invoices.event_id')
      .leftJoin('neighbourhood', 'hood', 'hood.id = event.sub_venue_id')

      .getRawOne();

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
    const alreadyExists = await this.invoiceRepository.findOne({
      where: { event_id: eventId },
    });

    if (alreadyExists) {
      throw new BadRequestException({
        message: 'Invoice has been already generated  for the event. ',
      });
    }

    const date = new Date(); // or any date you want
    const formatted = format(date, 'MMM').toUpperCase(); // e.g., '4 MAR'

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
        ? parseInt(lastInvoice.invoice_number.split('-')[2])
        : 1000;

      const newInvoiceNumber = `INV-${formatted}-${lastInvoiceNumber + 1}`;
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

      const savedInvoice = await this.invoiceRepository.save(newInvoice);
      return {
        message: 'Invoice generated successfully',
        data: savedInvoice,
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
        'event.slug AS eventName',
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

      const buffer = await this.generatePDF(html);

      const emailPayload = {
        to: invoice.userEmail,
        subject: 'Invoice For Event',
        templateName: 'invoice-email.html',
        replacements: {
          eventDate: format(invoice.eventDate, 'd MMMM yyyy'),
          venueName: invoice.venueName,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          eventName: invoice.eventName,
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
      if (error instanceof HttpException) {
        throw error;
      }
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
  // calculate Over Dues Day
  async handleOverdueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const invoices = await this.invoiceRepository.find({
      where: { status: 'unpaid', user_type: UserType.VENUE },
    }); // Adjust based on your ORM

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (invoice.overdue !== overdueDays) {
          invoice.overdue = overdueDays;
          await this.invoiceRepository.save(invoice);
        }
      }
    }
  }

  async applyLateFee(invoiceId: number) {
    try {
      const invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new NotFoundException({
          message: `Invoice with ID ${invoiceId} not found.`,
        });
      }

      const overdueDays = invoice.overdue || 0;

      const lateFee = Number(overdueDays * 25);
      // Add late fee to total_with_tax
      invoice.total_with_tax += lateFee;

      await this.invoiceRepository.save(invoice);

      return {
        message: 'Late fees applied Successfully.',
        data: {
          invoiceId: invoice.id,
          overdueDays,
          lateFee,
          updatedTotal: invoice.total_with_tax,
        },
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(error.message);
    }
  }

  async updateInvoiceStatus(invoiceId: number, dto: UpdateInvoiceStatus) {
    const { invAmountPaid, status, chequeNo, paymentDate } = dto;

    try {
      const invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
      });
      if (!invoice) {
        throw new NotFoundException({
          message: `Invoice with ID ${invoiceId} not found.`,
        });
      }

      this.invoiceRepository.update(
        { id: invoice.id },
        { status, chequeNo, invAmountPaid, payment_date: paymentDate },
      );

      await this.invoiceRepository.save(invoice);
      return { message: 'Invoice returned Successfully', status: true }; // Save the updated invoice
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
