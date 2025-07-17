import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
import { format } from 'date-fns';

import { EmailService } from '../Email/email.service';
import { EntertainerInvoice } from './entities/entertainer-invoice.entity';
import { EntertainerRateCard } from '../entertainer/entities/entertainer-rate-card.entity';
import { SpecialSubcategoryPrice } from '../admin/settings/entities/special-subcategory-prices.entity';
import { SubcategoryRate } from '../admin/settings/entities/subcategory-rates.entity';
import { RateCardDto } from '../admin/settings/dto/rate-card.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(EntertainerInvoice)
    private readonly entertainerInvoiceRepository: Repository<EntertainerInvoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(InvoiceBooking)
    private readonly invoiceBookingRepo: Repository<InvoiceBooking>,
    @InjectRepository(EntertainerRateCard)
    private readonly entertainerRateCardRepo: Repository<EntertainerRateCard>,
    @InjectRepository(SubcategoryRate)
    private readonly adminRateCardRepo: Repository<SubcategoryRate>,
    private readonly emailService: EmailService,
  ) {}

  // Invoice generation Logic for Entertainer
  async generateInvoice(userId: number, eventIds: number[], monthStr: string) {
    try {
      let total = 0;

      const invoiceDetails = [];

      const rateCard = await this.getEntertainerRateCard(Number(userId));
      const adminRateCard = await this.adminRateCardRepo.find({});

      for (const eventid of eventIds) {
        const {
          eventStartDateTime,
          eventEndDateTime,
          bookingId,
          eventId,
          subcategoryId,
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
            'booking.subcategoryId AS subcategoryId',
            'event.title AS eventName',
            'event.description AS eventDescription',
            'event.eventStartDateTime AS eventStartDateTime',
            'event.eventEndDateTime AS eventEndDateTime',
          ])
          .getRawOne();

        let rateCardObj: any;

        // Get entertainer rate Card If he set it  otherwise apply admin/rates
        rateCardObj =
          rateCard?.filter((item) => item.subcategoryId == subcategoryId) || [];

        if (
          rateCardObj.length === 0 ||
          rateCardObj[0].basePrice === 0 ||
          rateCardObj[0].basePrice === '0.00' ||
          rateCardObj[0].pricePerExtra30Min === '0.00' ||
          rateCardObj[0].pricePerExtra30Min === '0' ||
          rateCardObj[0].pricePerExtra30Min === 0 ||
          rateCardObj[0].basePrice == null
        ) {
          rateCardObj =
            adminRateCard?.filter(
              (item) => item.subcategoryId == subcategoryId,
            ) || [];
        }

        if (rateCardObj.length === 0) {
          throw new BadRequestException(
            'Invoice cannot be generated: no rate found',
          );
        }

        const pricePerHour = Number(rateCardObj[0].basePrice);
        const pricePerExtra30Min = Number(rateCardObj[0].pricePerExtra30Min);

        const durationInHours = this.getDurationInHours(
          eventStartDateTime,
          eventEndDateTime,
        );

        // New Logic Introduction
        total = pricePerHour;
        const extraHours = durationInHours - 1;

        if (extraHours > 0) {
          // Convert extra hours to number of 30-minute blocks (rounded up)
          const extra30MinBlocks = Math.ceil(extraHours * 2);
          total += extra30MinBlocks * pricePerExtra30Min;
        }
        total = this.roundToTwo(total);
        invoiceDetails.push({ bookingId, eventId });
      }

      const lastInvoice = await this.entertainerInvoiceRepository
        .createQueryBuilder('invoices')
        .orderBy('invoices.id', 'DESC')
        .limit(1)
        .getOne();

      // checks last invoice number and  increment it by one.
      const lastInvoiceNumber = lastInvoice
        ? parseInt(lastInvoice.invoice_number.split('-')[2])
        : 1000;

      const issueDate = new Date();
      const formattedDate = this.formatDateForInvoice(issueDate);
      const newInvoiceNumber = `${formattedDate}-${userId}-${lastInvoiceNumber + 1}`;

      const newInvoice = this.entertainerInvoiceRepository.create({
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

      const savedInvoice =
        await this.entertainerInvoiceRepository.save(newInvoice);

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
        message: 'Invoice generated successfully',
        data: newInvoice,
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  // Fetch All Invoices for Entertainer
  async findAllInvoice(userId: number, role, page = 1, pageSize = 10) {
    try {
      if (role === 'entertainer') {
        return await this.getEntertainerInvoice(userId, page, pageSize);
      } else {
        return await this.getInvoices(userId, page, pageSize);
      }
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }

  // Calculate Duration
  // async generateInvoicePdf(invoiceId: number) {
  //   try {
  //     let total = 0;
  //     const invoiceDetails = [];

  //     const bookings = await this.invoiceBookingRepo.find({
  //       where: { invoiceId: invoiceId },
  //       select: ['bookingId', 'eventId'],
  //     });

  //     for (const booking of bookings) {
  //       const {
  //         eventName,
  //         invoiceNumber,
  //         issueDate,
  //         eventDescription,
  //         eventStartTime,
  //         eventEndTime,
  //         bookingId,
  //         eventId,
  //         pricePerEvent,
  //         totalWithTax,
  //       } = await this.bookingRepository
  //         .createQueryBuilder('booking')
  //         .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
  //         .leftJoin('event', 'event', 'event.id = booking.eventId')
  //         .leftJoin('invoices', 'invoice', 'invoice.id =:invoiceId', {
  //           invoiceId,
  //         })

  //         .where('booking.id=:bookingId', { bookingId: booking.bookingId })
  //         .select([
  //           'booking.id AS bookingId',
  //           'booking.eventId AS eventId',
  //           'event.slug AS eventName',
  //           'event.description AS eventDescription',
  //           'event.startTime AS eventStartTime',
  //           'event.endTime AS eventEndTime',
  //           'ent.pricePerEvent AS pricePerEvent',
  //           'invoice.invoice_number  AS invoiceNumber',
  //           'invoice.issue_date  AS issueDate',
  //           'invoice.total_with_tax AS  totalWithTax',
  //         ])
  //         .getRawOne();

  //       const durationInHours = this.getDurationInHours(
  //         eventStartTime,
  //         eventEndTime,
  //       );
  //       const totalAmount = pricePerEvent * durationInHours;

  //       total += totalAmount;

  //       invoiceDetails.push({
  //         bookingId,
  //         eventId,
  //         eventName,
  //         pricePerEvent,
  //         durationInHours,
  //         totalAmount,
  //       });
  //     }

  //     const { issue_date, invoice_number, total_with_tax } =
  //       await this.invoiceRepository.findOne({
  //         where: { id: invoiceId },
  //         select: ['issue_date', 'invoice_number', 'total_with_tax'],
  //       });
  // const htmlContent = await this.generateInvoiceHtml({
  //   invoiceNumber: invoice_number,
  //   issueDate: issue_date,
  //   dueDate: '2025-05-10',
  //   items: invoiceDetails,
  //   totalWithTax: total,
  // });

  // const pdfBuffer = await this.generatePDF(htmlContent);
  // const buffer = Buffer.from(pdfBuffer);
  // // Send Email To client
  // console.log('pdfBuffer node ', pdfBuffer);
  //   const emailPayload = {
  //     to: 'anshulrangra495@gmail.com',
  //     subject: 'Invoice For Event',
  //     templateName: 'invoice-email.html',
  //     replacements: {
  //       eventDate: '12-04-2023',
  //       venueName: 'Hi',
  //       invoiceNumber: 'hi',
  //       totalAmount: 'hi',
  //       evevntName: 'hi',
  //     },
  //     attachments: [
  //       {
  //         filename: `invoice.pdf`,
  //         content: pdfBuffer, // a Buffer from Puppeteer
  //         contentType: 'application/pdf',
  //       },
  //     ],
  //   };

  //   await this.emailService.handleSendEmail(emailPayload);
  //   return {
  //     message: 'Pdf for Generated Successfully',
  //     data: invoiceDetails,
  //     status: true,
  //   };
  // } catch (error) {
  //   throw new InternalServerErrorException({
  //     message: error.message,
  //     status: false,
  //   });
  // }

  private getDurationInHours(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const diffInMinutes = differenceInMinutes(end, start);

    // Round up to nearest 30 minutes (0.5 hour)
    const roundedToHalfHour = Math.ceil(diffInMinutes / 30) * 0.5;

    return roundedToHalfHour;
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

  // private async generatePDF(htmlContent): Promise<Buffer> {
  //   console.log('Inside Function', htmlContent);
  //   const browser = await puppeteer.launch({
  //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
  //     headless: true,
  //   });
  //   const page = await browser.newPage();
  //   await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  //   const pdfBuffer = await page.pdf({ format: 'a3' });

  //   await browser.close();
  //   return pdfBuffer;
  // }

  async getInvoiceById(invoiceId: number) {
    try {
      const invoice = await this.invoiceRepository
        .createQueryBuilder('invoices')
        .leftJoin('event', 'event', 'event.id = invoices.event_id')
        .where('invoices.id = :invoiceId', { invoiceId })

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
          'event.slug AS slug',
          'event.title AS eventName',
        ])
        .getRawOne(); // Use getRawMany if you're not using relations

      return {
        message: 'Invoice returned Successfully',
        status: true,
        data: invoice,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  // New One Created for Entertainer Invoice
  private async getEntertainerInvoice(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const data = await this.entertainerInvoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('entertainers', 'ent', 'ent.id = invoices.user_id')
      .leftJoin('cities', 'city', 'city.id = ent.city')
      .leftJoin('states', 'state', 'state.id = ent.state')
      .where('invoices.user_id = :userId', {
        userId,
      })
      .andWhere('invoices.user_type = :role', { role: 'entertainer' })
      .select([
        'invoices.id AS id',
        'invoices.invoice_number AS invoice_number',
        'invoices.user_id AS user_id',
        'invoices.issue_date AS issue_date',
        'invoices.due_date AS due_date',
        'invoices.total_amount AS total_amount',
        'invoices.tax_rate AS tax_rate',
        'invoices.tax_amount AS tax_amount',
        'invoices.total_with_tax AS total_with_tax',
        'invoices.status AS status',
        'invoices.payment_method AS payment_method',
        'invoices.payment_date AS payment_date',

        'ent.name AS entertainerName',
        'ent.addressLine1 AS addressLine1',
        'ent.addressLine2 AS addressLine2',
        'ent.pricePerEvent AS pricePerHour',
        'ent.city AS city_code',
        'ent.state AS state_code',
        'state.name AS stateName',
        'city.name AS cityName',

        // This subquery gets all events in one JSON array for this invoice
        `(SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'eventId', e.id,
      'slug', e.slug,
      'title', e.title,
      'eventStartDateTime', e.eventStartDateTime,
      'eventEndDateTime', e.eventEndDateTime
      
    )
  )
  FROM invoice_bookings ib
  JOIN event e ON e.id = ib.event_id
  WHERE ib.invoice_id = invoices.id
) AS events`,
      ])
      .orderBy('invoices.issue_date', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();
    const parsedResults = await Promise.all(
      data.map(async ({ events, ...rest }) => {
        const parsedEvents = events
          ? await Promise.all(
              JSON.parse(events).map(async (event: any) => {
                const duration = this.getDurationInHours(
                  event.eventStartDateTime,
                  event.eventEndDateTime,
                );

                const calculatedAmount = await this.getCalculatedAmount(
                  userId,
                  event.eventId,
                  duration,
                );

                return {
                  ...event,
                  amount: calculatedAmount,
                  duration,
                };
              }),
            )
          : [];

        return {
          ...rest,
          events: parsedEvents,
        };
      }),
    );

    const totalCount = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .where('invoices.user_id = :userId', {
        userId,
      })
      .andWhere('invoices.user_type = :role', { role: 'entertainer' })
      .getCount();

    return {
      message: 'Invoices fetched successfully',
      status: true,
      data: parsedResults,
      page,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      pageSize,
    };
  }

  private async getInvoices(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const offset = (page - 1) * pageSize;

    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
      .leftJoin('cities', 'city', 'city.id = venue.city')
      .where('invoices.user_id = :userId AND invoices.user_type =:role', {
        userId,
        role: 'venue',
      })

      .select([
        'invoices.id AS id',
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
        `(
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'slug', e.slug,
      'title', e.title,
      'eventId', e.id,
      'eventStartDateTime', e.eventStartDateTime,
      'eventEndDateTime', e.eventEndDateTime
    )
  )
  FROM invoice_events ie
  JOIN event e ON e.id = ie.event_id
  WHERE ie.invoice_id = invoices.id
) AS events
`,
        'code.stateCode AS stateNameCode',
        'city.name AS cityName',
        'state.name AS stateName',
        'venue.name AS venueName',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.city AS cityCode',
        'venue.state AS stateCode',
      ])
      .offset(offset)
      .limit(pageSize)
      .getRawMany();

    const parsedResult = invoices.map(({ events, ...rest }) => {
      return {
        ...rest,
        events: events ? JSON.parse(events) : [],
      };
    });

    // Optional: Get total count for pagination metadata
    const totalCount = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .where('invoices.user_id = :userId', { userId })
      .andWhere('invoices.user_type = :role', { role: 'venue' })
      .getCount();

    return {
      message: 'Invoice fetched Successfully',
      status: true,
      data: parsedResult,
      totalCount,
      page,
      pageSize,
    };
  }

  formatDateForInvoice(dateInput: string | Date): string {
    const date = new Date(dateInput);
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth is 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // last 2 digits of year

    return `${month}${day}${year}`; // MMDDYY
  }

  // Generate Entertainer Code
  generateEntertainerCode(
    entertainerId: number,
    entertainerName: string,
  ): string {
    if (!entertainerName || typeof entertainerId !== 'number') return '';

    const initials = entertainerName
      .split(/\s+/) // split by spaces
      .filter(Boolean) // remove empty strings
      .map((word) => word.charAt(0).toUpperCase()) // take first letter and uppercase
      .join('');

    return `${initials}${entertainerId}`;
  }

  async getEntertainerRateCard(entertainerId: number) {
    try {
      const rateCard = await this.entertainerRateCardRepo.find({
        where: { entertainerId },
        select: ['subcategoryId', 'basePrice', 'pricePerExtra30Min', 'id'],
      });

      if (!rateCard) return null;
      return rateCard;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // New Logic For Invoice Sending

  async getCalculatedAmount(
    entertainerId: number,
    eventId: number,
    durationInHours: number,
  ) {
    const rateCard = await this.getEntertainerRateCard(Number(entertainerId));

    const adminRateCard = await this.adminRateCardRepo.find({});
    let rateCardObj: any;

    const relatedBooking = await this.bookingRepository.findOne({
      where: { eventId, entId: entertainerId },
      select: ['categoryId', 'subcategoryId'],
    });
    // Get entertainer rate Card If he set it  otherwise apply admin/rates
    rateCardObj =
      rateCard?.filter(
        (item) => item.subcategoryId == relatedBooking?.subcategoryId,
      ) || [];

    if (
      rateCardObj.length === 0 ||
      rateCardObj[0].basePrice === 0 ||
      rateCardObj[0].basePrice === '0.00' ||
      rateCardObj[0].pricePerExtra30Min === '0.00' ||
      rateCardObj[0].pricePerExtra30Min === '0' ||
      rateCardObj[0].pricePerExtra30Min === 0 ||
      rateCardObj[0].basePrice == null
    ) {
      rateCardObj =
        adminRateCard?.filter(
          (item) => item.subcategoryId == relatedBooking.subcategoryId,
        ) || [];
    }

    if (rateCardObj.length === 0) {
      return null;
    }

    const pricePerHour = Number(rateCardObj[0].basePrice);
    const pricePerExtra30Min = Number(rateCardObj[0].pricePerExtra30Min);

    // New Logic Introduction
    let total = pricePerHour;
    const extraHours = durationInHours - 1;

    if (extraHours > 0) {
      const extra30MinBlocks = Math.ceil(extraHours * 2);
      total += extra30MinBlocks * pricePerExtra30Min;
    }
    return Number((total = this.roundToTwo(total)));
  }
}
