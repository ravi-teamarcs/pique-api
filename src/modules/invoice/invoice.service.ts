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
import { startOfMonth, endOfMonth, differenceInMinutes, parse } from 'date-fns';
import { InvoiceBooking } from './entities/invoice-booking.entity';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { EmailService } from '../Email/email.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(InvoiceBooking)
    private readonly invoiceBookingRepo: Repository<InvoiceBooking>,
    private readonly emailService: EmailService,
  ) {}

  // Invoice generation Logic for Entertainer
  async generateInvoice(userId: number, eventIds: number[], monthStr: string) {
    try {
      let total = 0;
      let invoiceMonth = monthStr?.toUpperCase();
      const invoiceDetails = [];
      for (const eventid of eventIds) {
        const {
          eventName,
          eventStartTime,
          eventEndTime,
          bookingId,
          eventId,
          pricePerEvent,
        } = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
          .leftJoin('event', 'event', 'event.id = booking.eventId')

          .where('booking.entId = :userId AND  booking.eventId=:eventid', {
            userId,
            eventid,
          })
          .select([
            'booking.id AS bookingId',
            'booking.eventId AS eventId',
            'event.title AS eventName',
            'event.description AS eventDescription',
            'event.startTime AS eventStartTime',
            'event.endTime AS eventEndTime',
            'ent.pricePerEvent AS pricePerEvent',
          ])
          .getRawOne();

        const durationInHours = this.getDurationInHours(
          eventStartTime,
          eventEndTime,
        );
        const totalAmount = pricePerEvent * durationInHours;

        total += totalAmount;

        invoiceDetails.push({ bookingId, eventId });
      }

      const lastInvoice = await this.invoiceRepository
        .createQueryBuilder('invoices')
        .orderBy('invoices.id', 'DESC')
        .limit(1)
        .getOne();

      // checks last invoice number and  increment it by one.
      const lastInvoiceNumber = lastInvoice
        ? parseInt(lastInvoice.invoice_number.split('-')[2])
        : 1000;

      const newInvoiceNumber = `INV-${invoiceMonth}-${lastInvoiceNumber + 1}`;
      const issueDate = new Date();

      const newInvoice = this.invoiceRepository.create({
        invoice_number: newInvoiceNumber,
        user_id: userId,
        event_id: null,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: null,
        total_amount: parseFloat(total.toFixed(2)),
        tax_rate: 0,
        tax_amount: 0,
        total_with_tax: parseFloat(total.toFixed(2)),
        status: InvoiceStatus.UNPAID,
        payment_method: '',
        payment_date: null,
        overdue: null,
        booking_id: null,
      });
      const savedInvoice = await this.invoiceRepository.save(newInvoice);

      const updatedInvoiceDetails = invoiceDetails.map((item) => ({
        ...item,
        invoiceId: savedInvoice.id,
      }));

      for (const item of updatedInvoiceDetails) {
        const mapping = this.invoiceBookingRepo.create({
          invoiceId: item.invoiceId,
          eventId: item.eventId,
          bookingId: item.bookingId,
        });
        await this.invoiceBookingRepo.save(mapping);
      }

      return {
        message: 'Invoice generated Successfully',
        data: newInvoice,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  // Fetch All Invoices for Entertainer
  async findAllInvoice(userId: number) {
    try {
      const invoices = await this.invoiceRepository
        .createQueryBuilder('invoices')

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
        ])
        .getRawMany(); // Use getRawMany if you're not using relations

      return {
        message: 'Invoice returned Successfully',
        status: true,
        data: invoices,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  // Calculate Duration
  async generateInvoicePdf(invoiceId: number) {
    try {
      let total = 0;
      const invoiceDetails = [];

      const bookings = await this.invoiceBookingRepo.find({
        where: { invoiceId: invoiceId },
        select: ['bookingId', 'eventId'],
      });

      for (const booking of bookings) {
        const {
          eventName,
          invoiceNumber,
          issueDate,
          eventDescription,
          eventStartTime,
          eventEndTime,
          bookingId,
          eventId,
          pricePerEvent,
          totalWithTax,
        } = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
          .leftJoin('event', 'event', 'event.id = booking.eventId')
          .leftJoin('invoices', 'invoice', 'invoice.id =:invoiceId', {
            invoiceId,
          })

          .where('booking.id=:bookingId', { bookingId: booking.bookingId })
          .select([
            'booking.id AS bookingId',
            'booking.eventId AS eventId',
            'event.title AS eventName',
            'event.description AS eventDescription',
            'event.startTime AS eventStartTime',
            'event.endTime AS eventEndTime',
            'ent.pricePerEvent AS pricePerEvent',
            'invoice.invoice_number  AS invoiceNumber',
            'invoice.issue_date  AS issueDate',
            'invoice.total_with_tax AS  totalWithTax',
          ])
          .getRawOne();

        const durationInHours = this.getDurationInHours(
          eventStartTime,
          eventEndTime,
        );
        const totalAmount = pricePerEvent * durationInHours;

        total += totalAmount;

        invoiceDetails.push({
          bookingId,
          eventId,
          eventName,
          eventDescription,
          pricePerEvent,
          durationInHours,
          totalAmount,
        });
      }

      const { issue_date, invoice_number, total_with_tax } =
        await this.invoiceRepository.findOne({
          where: { id: invoiceId },
          select: ['issue_date', 'invoice_number', 'total_with_tax'],
        });
      const htmlContent = await this.generateInvoiceHtml({
        invoiceNumber: invoice_number,
        issueDate: issue_date,
        dueDate: '2025-05-10',
        items: invoiceDetails,
        totalWithTax: total,
      });

      const pdfBuffer = await this.generatePDF(htmlContent);
      // const buffer = Buffer.from(pdfBuffer);
      // Send Email To client
      console.log('pdfBuffer node ', pdfBuffer);
      const emailPayload = {
        to: 'anshulrangra495@gmail.com',
        subject: 'Invoice For Event',
        templateName: 'invoice-email.html',
        replacements: {
          eventDate: '12-04-2023',
          venueName: 'Hi',
          invoiceNumber: 'hi',
          totalAmount: 'hi',
          evevntName: 'hi',
        },
        attachments: [
          {
            filename: `invoice.pdf`,
            content: pdfBuffer, // a Buffer from Puppeteer
            contentType: 'application/pdf',
          },
        ],
      };

      await this.emailService.handleSendEmail(emailPayload);
      return {
        message: 'Pdf for Generated Successfully',
        data: invoiceDetails,
        status: true,
      };
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

  async generateInvoiceHtml(data: any): Promise<string> {
    const filePath = path.resolve(
      process.cwd(),
      'src',
      'modules',
      'invoice',
      'template',
      'invoice-template.ejs',
    );

    // Optional: confirm existence
    if (!fs.existsSync(filePath)) {
      throw new Error('Template file does not exist at: ' + filePath);
    }

    const template = fs.readFileSync(filePath, 'utf-8');

    return new Promise((resolve, reject) => {
      ejs.renderFile(filePath, data, {}, (err, str) => {
        if (err) {
          console.error('Error rendering template:', err);
          reject(err); // Reject the promise if there is an error
        } else {
          resolve(str); // Resolve the promise with the rendered string
        }
      });
    });
    // console.log('HTML', html);
  }

  private async generatePDF(htmlContent): Promise<Buffer> {
    console.log('Inside Function', htmlContent);
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'a3' });

    await browser.close();
    return pdfBuffer;
  }
}
