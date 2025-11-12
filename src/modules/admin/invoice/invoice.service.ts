import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice, InvoiceStatus, UserType } from './entities/invoices.entity';
import { Admin, Between, In, Like, Repository } from 'typeorm';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Venue } from '../venue/entities/venue.entity';
import { InvoiceQueryDto } from './Dto/invoice-query.dto';
import { Booking } from '../booking/entities/booking.entity';
import {
  differenceInMinutes,
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from 'date-fns';
import { loadEmailTemplate } from 'src/common/email-templates/utils/email.utils';
import { EmailService } from 'src/modules/Email/email.service';
import * as pdf from 'html-pdf';
import { UpdateInvoiceStatus } from './Dto/update-invoice-status.dto';
import { NotificationService } from 'src/modules/notification/notification.service';
import { AdminUser } from '../adminuser/entities/AdminUser.entity';
import { Event } from '../events/entities/event.entity';
import { Setting } from '../settings/entities/setting.entity';
import { InvoiceEvent } from './entities/invoices-event.entity';
import { Logger } from '@nestjs/common';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';
import { enUS } from 'date-fns/locale';
import { EntertainerInvoice } from 'src/modules/invoice/entities/entertainer-invoice.entity';
import { SubcategoryRate } from '../settings/entities/subcategory-rates.entity';
import { SpecialSubcategoryPrice } from '../settings/entities/special-subcategory-prices.entity';
import { EntertainerRateCard } from '../../entertainer/entities/entertainer-rate-card.entity';
import { DateTime } from 'luxon';
import { utcToZonedTime, format as tzFormat } from 'date-fns-tz';
import id from 'date-fns/locale/id';
import { platform } from 'os';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(EntertainerInvoice)
    private readonly entInvoiceRepository: Repository<EntertainerInvoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(InvoiceEvent)
    private readonly invEventRepository: Repository<InvoiceEvent>,

    @InjectRepository(SubcategoryRate)
    private readonly adminRateCardRepository: Repository<SubcategoryRate>,
    @InjectRepository(EntertainerRateCard)
    private readonly entertainerRateCard: Repository<EntertainerRateCard>,
    @InjectRepository(SpecialSubcategoryPrice)
    private readonly specialRateCardRepository: Repository<SpecialSubcategoryPrice>,
    private readonly emailService: EmailService,
    private readonly notifyService: NotificationService,
  ) {}
  private readonly logger = new Logger(InvoiceService.name);

  async findAll(dto: InvoiceQueryDto) {
    const { page = 1, pageSize = 10, search = '', role } = dto;
    const skip = (page - 1) * pageSize;

    if (role === 'entertainer') {
      return await this.getAdminInvoiceForEntertainer(
        page,
        pageSize,
        search,
        role,
      );
    }
    // New Logic to be introduced

    return await this.getVenueInvoices(page, pageSize, search, role);
    // Build base query with all conditions
  }

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

  // Latest Code of Generate Invoive (@Bhawani Thakur)
  // async generateInvoice(dto: CreateInvoiceDto) {
  //   let {
  //     eventId,
  //     pricePerHour,
  //     platformFee = 0,
  //     isFixed = true,
  //     discountInPercent = 0,
  //   } = dto;

  //   const alreadyExists = await this.invEventRepository.findOne({
  //     where: { eventId: eventId },
  //   });

  //   if (alreadyExists) {
  //     throw new BadRequestException({
  //       message: 'Invoice has been already generated for the event. ',
  //     });
  //   }

  //   try {
  //     const eventData = await this.eventRepository
  //       .createQueryBuilder('event')
  //       .leftJoin('venue', 'venue', 'venue.id = event.venueId')
  //       .select([
  //         'event.id AS eventId',
  //         'event.slug AS eventName',
  //         'event.eventStartDateTime AS eventStartDateTime',
  //         'event.eventEndDateTime AS eventEndDateTime',
  //         'event.venueId AS venueId',
  //         'venue.timezone AS timezone',
  //         `
  //   JSON_ARRAYAGG(
  //     JSON_OBJECT(
  //       'bookingId', booking.id,
  //       'entertainerId', booking.entId,
  //       'status', booking.status,
  //       'subcategoryId', booking.subcategoryId,
  //       'stageName', entertainer.name

  //     )
  //   ) AS bookings
  //   `,
  //       ])
  //       .leftJoin(
  //         'booking',
  //         'booking',
  //         'booking.eventId = event.id AND booking.status IN (:...statuses)',
  //         { statuses: ['confirmed', 'completed'] },
  //       )

  //       .leftJoin(
  //         'entertainers',
  //         'entertainer',
  //         'entertainer.id = booking.entId',
  //       )
  //       .where('event.id = :eventId', { eventId })
  //       .groupBy('event.id')
  //       .getRawOne();

  //     const { bookings, ...restData } = eventData;
  //     const parsedRecord = {
  //       ...restData,
  //       bookings: bookings ? JSON.parse(bookings) : [],
  //     };

  //     const lastInvoice = await this.invoiceRepository
  //       .createQueryBuilder('invoices')
  //       .orderBy('invoices.id', 'DESC')
  //       .limit(1)
  //       .getOne();

  //     const lastInvoiceNumber = lastInvoice
  //       ? parseInt(lastInvoice.invoice_number.split('-')[2])
  //       : 1000;

  //     // Invoicing
  //     const invFormattedDate = this.formatDateForInvoice(
  //       parsedRecord.eventStartDateTime,
  //     );

  //     const newInvoiceNumber = `${invFormattedDate}-${parsedRecord.venueId}-${lastInvoiceNumber + 1} `;

  //     //// New logic Inrodutction
  //     const adminRateCard = await this.adminRateCardRepository.find();

  //     const zonedDate = utcToZonedTime(
  //       parsedRecord.eventStartDateTime,
  //       parsedRecord.timeZone,
  //     );
  //     const specialRateCard = await this.specialRateCardRepository.find({
  //       where: {
  //         date: tzFormat(zonedDate, 'yyyy-MM-dd', {
  //           timeZone: parsedRecord.timeZone,
  //         }),
  //       },
  //     });

  //     const parsedBookings = await Promise.all(
  //       parsedRecord?.bookings.map(async (book) => {
  //         let newPricePerHour: number;
  //         let pricePerExtra30Min: number;

  //         // If special rate card is available then use it otherwise use admin rate card.

  //         if (specialRateCard?.length > 0) {
  //           const rateCard = specialRateCard.find(
  //             (rate) => rate.subcategoryId === book.subcategoryId,
  //           );

  //           if (rateCard) {
  //             newPricePerHour = rateCard.specialPrice;
  //             pricePerExtra30Min = rateCard.pricePerExtra30Min;
  //           }
  //         } else if (adminRateCard?.length > 0) {
  //           const rateCard = adminRateCard.find(
  //             (rate) => rate.subcategoryId === book.subcategoryId,
  //           );
  //           if (rateCard) {
  //             newPricePerHour = rateCard.basePrice;
  //             pricePerExtra30Min = rateCard.pricePerExtra30Min;
  //           }
  //         }

  //         if (!(newPricePerHour || pricePerExtra30Min)) return;

  //         return {
  //           ...book,
  //           pricePerHour: newPricePerHour,
  //           pricePerExtra30Min,
  //         };
  //       }),
  //     );

  //     let totalAmount = 0;

  //     for (const book of parsedBookings) {
  //       // Provided Payload for calculation
  //       const payload = {
  //         eventStartDateTime: parsedRecord.eventStartDateTime,
  //         eventEndDateTime: parsedRecord.eventEndDateTime,
  //         pricePerHour: Number(book.pricePerHour),
  //         pricePerExtra30Min: Number(book.pricePerExtra30Min),
  //         discountInPercent,
  //         isFixed,
  //         platformFee: platformFee,
  //       };

  //       const totalWithPlatformFee = this.calculatingInvoiceAmount(payload);
  //       totalAmount += Number(totalWithPlatformFee);
  //     }

  //     // Invoice Generated On and Due Date
  //     const issueDate = new Date();
  //     const dueDate = new Date(issueDate);
  //     dueDate.setDate(dueDate.getDate() + 60);

  //     const newInvoice = this.invoiceRepository.create({
  //       invoice_number: newInvoiceNumber,
  //       user_id: Number(parsedRecord.venueId),
  //       user_type: UserType.VENUE,
  //       event_id: null,
  //       issue_date: issueDate.toISOString().split('T')[0],
  //       due_date: new Date(dueDate).toISOString().split('T')[0],
  //       total_amount: totalAmount,
  //       tax_rate: platformFee ?? 0,
  //       tax_amount: 0,
  //       total_with_tax: parseFloat(totalAmount.toFixed(2)),
  //       status: InvoiceStatus.AWAITING_PAYMENT,
  //       payment_method: '',
  //       payment_date: null,
  //       booking_id: null,
  //     });

  //     const savedInvoice = await this.invoiceRepository.save(newInvoice);

  //     // Save the record to (Invoice Event Mapping)
  //     const invoiceMetaData = this.invEventRepository.create({
  //       invoiceId: savedInvoice.id,
  //       eventId: eventId,
  //       eventDate: new Date().toISOString(),
  //       eventPrice: Number(totalAmount) - Number(platformFee),
  //     });
  //     await this.invEventRepository.save(invoiceMetaData);

  //     return {
  //       message: 'Invoice generated successfully',
  //       data: savedInvoice,
  //       status: true,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException({
  //       message: error.message,
  //       status: false,
  //     });
  //   }
  // }

  async generateInvoice(dto: CreateInvoiceDto) {
    let {
      eventId,
      pricePerHour,
      platformFee = 0,
      isFixed = true,
      discountInPercent = 0,
    } = dto;

    // Check if invoice already exists
    const alreadyExists = await this.invEventRepository.findOne({
      where: { eventId },
    });

    if (alreadyExists) {
      throw new BadRequestException({
        message: 'Invoice has been already generated for the event.',
      });
    }

    try {
      // Fetch event and all related bookings with categories/subcategories
      const eventData = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin(
          'booking',
          'booking',
          'booking.eventId = event.id AND booking.status IN (:...statuses)',
          { statuses: ['confirmed', 'completed'] },
        )
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.id = booking.entId',
        )
        .leftJoin(
          'booking_category_subcategory',
          'bcs',
          'bcs.booking_id = booking.id',
        )
        .leftJoin('categories', 'category', 'category.id = bcs.category_id')
        .leftJoin(
          'categories',
          'subcategory',
          'subcategory.id = bcs.subcategory_id',
        )
        .select([
          'event.id AS eventId',
          'event.slug AS eventName',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'event.venueId AS venueId',
          'venue.timezone AS timezone',
          `
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'bookingId', booking.id,
            'entertainerId', booking.entId,
            'status', booking.status,
            'stageName', entertainer.name,
            'categoryId', category.id,
            'categoryName', category.name,
            'subCategoryId', subcategory.id,
            'subCategoryName', subcategory.name
          )
        ) AS bookings
        `,
        ])
        .where('event.id = :eventId', { eventId })
        .groupBy('event.id')
        .getRawOne();

      if (!eventData) {
        throw new NotFoundException({
          message: 'Event not found or has no confirmed bookings.',
        });
      }

      // Parse bookings JSON
      const { bookings, ...restData } = eventData;
      const parsedRecord = {
        ...restData,
        bookings: bookings ? JSON.parse(bookings) : [],
      };

      // Fetch rate cards
      const adminRateCard = await this.adminRateCardRepository.find();

      const zonedDate = utcToZonedTime(
        parsedRecord.eventStartDateTime,
        parsedRecord.timezone,
      );

      const specialRateCard = await this.specialRateCardRepository.find({
        where: {
          date: tzFormat(zonedDate, 'yyyy-MM-dd', {
            timeZone: parsedRecord.timezone,
          }),
        },
      });

      // Enrich each booking+subcategory with rate card details
      const parsedBookings = await Promise.all(
        parsedRecord.bookings.map(async (book) => {
          let newPricePerHour: number | undefined;
          let pricePerExtra30Min: number | undefined;

          // Prefer special rate card if found
          if (specialRateCard?.length > 0) {
            const rateCard = specialRateCard.find(
              (rate) => rate.subcategoryId === book.subCategoryId,
            );
            if (rateCard) {
              newPricePerHour = rateCard.specialPrice;
              pricePerExtra30Min = rateCard.pricePerExtra30Min;
            }
          }

          // Otherwise fallback to admin rate card
          if (
            !(newPricePerHour || pricePerExtra30Min) &&
            adminRateCard?.length > 0
          ) {
            const rateCard = adminRateCard.find(
              (rate) => rate.subcategoryId === book.subCategoryId,
            );
            if (rateCard) {
              newPricePerHour = rateCard.basePrice;
              pricePerExtra30Min = rateCard.pricePerExtra30Min;
            }
          }

          if (!(newPricePerHour || pricePerExtra30Min)) return null;

          return {
            ...book,
            pricePerHour: newPricePerHour,
            pricePerExtra30Min,
          };
        }),
      );

      // Filter nulls and start total calculation
      const validBookings = parsedBookings.filter(Boolean);
      let totalAmount = 0;

      for (const book of validBookings) {
        const payload = {
          eventStartDateTime: parsedRecord.eventStartDateTime,
          eventEndDateTime: parsedRecord.eventEndDateTime,
          pricePerHour: Number(book.pricePerHour),
          pricePerExtra30Min: Number(book.pricePerExtra30Min),
          discountInPercent,
          isFixed,
          platformFee,
        };

        const totalWithPlatformFee = this.calculatingInvoiceAmount(payload);
        totalAmount += Number(totalWithPlatformFee);
      }

      // Generate invoice number
      const lastInvoice = await this.invoiceRepository
        .createQueryBuilder('invoices')
        .orderBy('invoices.id', 'DESC')
        .limit(1)
        .getOne();

      const lastInvoiceNumber = lastInvoice
        ? parseInt(lastInvoice.invoice_number.split('-')[2])
        : 1000;

      const invFormattedDate = this.formatDateForInvoice(
        parsedRecord.eventStartDateTime,
      );

      const newInvoiceNumber = `${invFormattedDate}-${parsedRecord.venueId}-${lastInvoiceNumber + 1}`;

      // Invoice dates
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 60);

      // Create and save invoice
      const newInvoice = this.invoiceRepository.create({
        invoice_number: newInvoiceNumber,
        user_id: Number(parsedRecord.venueId),
        user_type: UserType.VENUE,
        event_id: Number(parsedRecord.eventId),
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: new Date(dueDate).toISOString().split('T')[0],
        total_amount: totalAmount,
        tax_rate: platformFee ?? 0,
        tax_amount: 0,
        total_with_tax: parseFloat(totalAmount.toFixed(2)),
        status: InvoiceStatus.AWAITING_PAYMENT,
        payment_method: '',
        payment_date: null,
        booking_id: null,
      });

      const savedInvoice = await this.invoiceRepository.save(newInvoice);

      // Save invoice–event mapping
      const invoiceMetaData = this.invEventRepository.create({
        invoiceId: savedInvoice.id,
        eventId: eventId,
        eventDate: new Date().toISOString(),
        eventPrice: Number(totalAmount) - Number(platformFee),
      });

      await this.invEventRepository.save(invoiceMetaData);

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

  // This One Need Changes
  async sendInvoice(id: number) {
    let invoiceDetails = [];

    const result = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('users', 'user', 'user.id = venue.userId')
      .leftJoin('states', 'state', 'state.id = venue.state')
      .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
      .leftJoin('cities', 'city', 'city.id = venue.city')
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
      'eventEndDateTime', e.eventEndDateTime,
      'eventPrice', ie.event_price
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
        'venue.email AS email',
        'venue.addressLine1 AS addressLine1',
        'venue.addressLine2 AS addressLine2',
        'venue.city AS cityCode',
        'venue.state AS stateCode',
        'venue.zipCode AS zipCode',
        'user.email AS user_email',
      ])
      .where('invoices.id = :id ', { id })
      .getRawOne();

    const { events, ...restData } = result;
    let invoice = {
      ...restData,
      events: events ? JSON.parse(events) : [],
    };

    if (!result) {
      throw new NotFoundException('Invoice not Found');
    }
    events &&
      JSON.parse(events).map((item) => {
        invoiceDetails.push({
          eventId: item.eventId,
          eventName: item.slug,
          contactEmail: invoice?.user_email || invoice?.email,
          eventPrice: item.eventPrice,
          durationInHours: this.getDurationInHours(
            item.eventStartDateTime,
            item.eventEndDateTime,
          ),
          totalAmount: item.eventPrice,
        });
      });

    try {
      const htmlContent = await this.generateInvoiceHtml({
        invoiceNumber: invoice.invoice_number,
        issueDate: format(invoice.issue_date, 'd MMMM yyyy', { locale: enUS }),
        dueDate: format(invoice.due_date, 'd MMMM yyyy', { locale: enUS }),
        address: `${invoice.addressLine1} ${invoice.addressLine2}`,
        venueName: invoice.venueName,
        contactEmail: invoice?.user_email || invoice?.email,
        city: invoice.cityName,
        state: invoice.stateName,
        items: invoiceDetails,
        zipCode: invoice.zipCode,
        totalWithTax: invoice.total_with_tax,
        platformFee: invoice.tax_rate || 0,
      });

      const buffer = await this.generatePDF(htmlContent);

      if (invoice.email || invoice.user_email) {
        const emailPayload = {
          to: invoice.user_email || invoice.email,
          subject: 'Event Invoice',
          templateName: 'invoice-email.html',
          replacements: {
            venueName: invoice.venueName,
            month: format(new Date(), 'MMMM yyyy', { locale: enUS }),
            invoiceNumber: invoice.invoice_number,
            totalAmount: invoice.total_with_tax,
          },
          attachments: [
            {
              filename: `${invoice.venueName}_invoice.pdf`,
              content: buffer, // a Buffer from Puppeteer
              contentType: 'application/pdf',
            },
          ],
        };
        await this.emailService.handleSendEmail(emailPayload);
        await this.invoiceRepository.update(
          { id },
          { isSent: true, sentDate: new Date() },
        );
      }
      return { message: 'Invoice sent Successfully ', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(error.message);
    }
  }

  private getDurationInHours(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const diffInMinutes = differenceInMinutes(end, start);

    // Round up to nearest 30 minutes (0.5 hour)
    const roundedToHalfHour = Math.ceil(diffInMinutes / 30) * 0.5;

    return roundedToHalfHour;
  }

  private async generatePDF(htmlContent): Promise<Buffer> {
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

    // const invoices = await this.invoiceRepository.find({
    //   where: { status: 'unpaid', user_type: UserType.VENUE },
    // }); // Adjust based on your ORM
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
      .leftJoin('users', 'user', 'user.id = venue.userId')
      .select(['venue.name As venueName', 'invoices.*', 'user.id As userId'])
      .where('invoices.status = :status', {
        status: InvoiceStatus.AWAITING_PAYMENT,
      })
      .andWhere('invoices.user_type = :userType', { userType: UserType.VENUE })
      .getRawMany();

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

        const message = `Dear Venue ${invoice.venueName}, \n\nThis is a reminder that your payment for the invoice number ${invoice.invoice_number} is overdue by ${invoice.overdue} days. Please make the payment at your earliest convenience to avoid any late fees.\n\nThank you.`;
        const adminMessage = `Dear Admin, \n\nThe payment for the invoice number ${invoice.invoice_number} from Venue ${invoice.venueName} is overdue by ${invoice.overdue} days. Please take necessary actions to follow up with the venue.\n\nThank you.`;

        const notificationPayload = {
          title: 'Payment Overdue Reminder',
          body: message,
          type: 'payment_alert_reminder',
        };

        const adminNotificationPayload = {
          title: 'Payment Overdue Reminder',
          body: adminMessage,
          type: 'payment_alert_reminder',
        };

        if (invoice.userId) {
          await this.notifyService.sendPush(
            notificationPayload,
            invoice.userId,
          );
        }
        let admins = await this.adminRepository.find({ where: { role: '1' } });
        if (admins?.length > 0) {
          for (const admin of admins) {
            await this.notifyService.sendAdminPush(
              adminNotificationPayload,
              Number(admin.id),
            );
          }
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

      const today = new Date().toISOString().split('T')[0];
      // If fee already applied today, skip
      if (invoice.lastLateFeeApplied === today) return;

      const dailyLateFee = 25;
      invoice.total_with_tax = Number(invoice.total_with_tax) + dailyLateFee;
      invoice.lateFeeTotal = Number(invoice.lateFeeTotal) + dailyLateFee;
      invoice.lastLateFeeApplied = today;

      await this.invoiceRepository.save(invoice);

      return {
        message: 'Late fees applied Successfully.',
        data: {
          invoiceId: invoice.id,
          overdueDays,
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
    const { invAmountPaid, status, chequeNo, paymentDate, role } = dto;

    try {
      if (role === 'venue') {
        const invoice = await this.invoiceRepository.findOne({
          where: { id: invoiceId },
        });

        if (!invoice) {
          throw new NotFoundException({
            message: `Invoice with ID ${invoiceId} not found.`,
          });
        }

        await this.invoiceRepository.update(
          { id: invoice.id },
          { status, chequeNo, invAmountPaid, payment_date: paymentDate },
        );

        return { message: 'Invoice returned Successfully', status: true };
      } else {
        const invoice = await this.entInvoiceRepository.findOne({
          where: { id: invoiceId },
        });

        if (!invoice) {
          throw new NotFoundException({
            message: `Invoice with ID ${invoiceId} not found.`,
          });
        }

        await this.entInvoiceRepository.update(
          { id: invoice.id },
          { status, chequeNo, invAmountPaid, payment_date: paymentDate },
        );
        return { message: 'Invoice returned Successfully', status: true };
      }

      // Save the updated invoice
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAdminInvoiceForEntertainer(
    page: number,
    pageSize: number,
    search,
    role,
  ) {
    const skip = (page - 1) * pageSize;

    const data = await this.entInvoiceRepository
      .createQueryBuilder('invoices')
      .leftJoin('entertainers', 'ent', 'ent.id = invoices.user_id')
      .leftJoin('users', 'user', 'user.id = ent.userId')
      .leftJoin('cities', 'city', 'city.id = ent.city')
      .leftJoin('states', 'state', 'state.id = ent.state')

      .andWhere('invoices.user_type = :role', { role: 'entertainer' })
      .select([
        'invoices.id AS id',
        'invoices.invoice_number AS invoice_number',
        'invoices.user_id AS user_id',
        'invoices.user_type AS user_type',
        'invoices.issue_date AS issue_date',
        'invoices.due_date AS due_date',
        'invoices.total_amount AS total_amount',
        'invoices.tax_rate AS tax_rate',
        'invoices.tax_amount AS tax_amount',
        'invoices.total_with_tax AS total_with_tax',
        'invoices.status AS status',
        'invoices.cheque_no AS cheque_no',
        'invoices.invAmountPaid AS inv_amount_paid',
        'invoices.payment_method AS payment_method',
        'invoices.payment_date AS payment_date',
        'invoices.isOutdated AS isOutdated',

        'ent.name AS entertainerName',
        'ent.id AS entertainerId',
        'ent.addressLine1 AS addressLine1',
        'ent.addressLine2 AS addressLine2',
        'ent.contact_number AS contactNumber',
        'ent.city AS city_code',
        'ent.pricePerEvent AS pricePerHour',
        'ent.city AS city_code',
        'ent.state AS state_code',
        'state.name AS stateName',
        'city.name AS cityName',
        'user.email AS email',

        // This subquery gets all events in one JSON array for this invoice
        `(
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'eventId', e.id,
      'slug', e.slug,
      'title', e.title,
      'eventStartDateTime', e.eventStartDateTime,
      'eventEndDateTime', e.eventEndDateTime,
       'amount', ib.event_price
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

    // const parsedResults = await Promise.all(
    //   data.map(async ({ events, pricePerHour, ...rest }) => {
    //     return {
    //       ...rest,
    //       pricePerHour,
    //       events: events
    //         ? await Promise.all(
    //             JSON.parse(events).map(
    //               async ({
    //                 eventStartDateTime,
    //                 eventEndDateTime,
    //                 ...eventRest
    //               }) => {
    //                 const duration = this.getDurationInHours(
    //                   eventStartDateTime,
    //                   eventEndDateTime,
    //                 );

    //                 const calculatedAmount = await this.getCalculatedAmount(
    //                   rest.entertainerId,
    //                   eventRest.eventId,
    //                   duration,
    //                 );

    //                 return {
    //                   ...eventRest,
    //                   eventStartDateTime,
    //                   eventEndDateTime,
    //                   amount: Number(calculatedAmount),
    //                   duration,
    //                 };
    //               },
    //             ),
    //           )
    //         : [],
    //     };
    //   }),
    // );
    const parsedResults = data.map(({ events, pricePerHour, ...rest }) => {
      return {
        ...rest,
        pricePerHour,
        events: events
          ? JSON.parse(events).map(
              ({ eventStartDateTime, eventEndDateTime, ...eventRest }) => {
                const duration = this.getDurationInHours(
                  eventStartDateTime,
                  eventEndDateTime,
                );

                return {
                  ...eventRest,
                  eventStartDateTime,
                  eventEndDateTime,
                  duration,
                };
              },
            )
          : [],
      };
    });

    const totalCount = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .andWhere('invoices.user_type = :role', { role: 'entertainer' })
      .getCount();

    return {
      message: 'Invoices fetched successfully',
      records: parsedResults,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      status: true,
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
  // Cron Jon Monthly  Invoice (Invoice Generation venue)
  async generateMonthlyInvoiceForVenue() {
    // Step 1: Get All the venues
    const venues = await this.venueRepository.find({
      where: { status: 'active' },
    });

    const now = new Date(); // or use any specific date
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    for (const venue of venues) {
      try {
        await this.invoiceForIndividualVenue(venue, monthStart, monthEnd);
        this.logger.log(`Invoice created for venue ${venue.id}`);
      } catch (error) {
        this.logger.error(
          `Invoice generation failed for venue ${venue.id}`,
          error,
        );
      }
    }
  }

  // Mothly invoice generation logic.
  calculatingInvoiceAmount(payload) {
    let {
      eventStartDateTime,
      eventEndDateTime,
      pricePerHour,
      pricePerExtra30Min,
      discountInPercent = 0,
      isFixed,
      platformFee = 0,
    } = payload;

    const durationInHours = this.getDurationInHours(
      eventStartDateTime,
      eventEndDateTime,
    );

    let totalAmount = pricePerHour;

    const extraHours = durationInHours - 1;

    if (extraHours > 0) {
      // Convert extra hours to number of 30-minute blocks (rounded up)
      const extra30MinBlocks = Math.ceil(extraHours * 2);

      totalAmount = totalAmount + extra30MinBlocks * pricePerExtra30Min;
    }

    totalAmount = this.roundToTwo(totalAmount);
    const discountAmount = this.roundToTwo(
      (totalAmount * discountInPercent) / 100,
    );
    const discountedTotal = this.roundToTwo(totalAmount - discountAmount);

    let totalWithPlatformFee = 0;

    if (isFixed) {
      totalWithPlatformFee = this.roundToTwo(discountedTotal + platformFee);
    } else {
      platformFee = (discountedTotal * platformFee) / 100;

      totalWithPlatformFee = this.roundToTwo(
        discountedTotal + (discountedTotal * platformFee) / 100,
      );
    }

    return totalWithPlatformFee;
  }
  // Generate Monthly Invoice Number.
  async invoiceForIndividualVenue(venue, monthStart, monthEnd) {
    const eventPrice = [];
    const confirmedEvents = await this.eventRepository.find({
      where: {
        venueId: venue.id,
        status: 'confirmed',
        eventStartDateTime: Between(monthStart, monthEnd),
      },
      select: ['id'],
    });

    const eventIds = confirmedEvents.map((event) => event.id);
    // Skip if no confirmed events
    if (eventIds.length === 0) return;

    // Check if Invoice already exists or not if exists then skip otherwise  proceede.
    const alreadyExsits = await this.invEventRepository.find({
      where: { eventId: In(eventIds) },
    });

    if (alreadyExsits?.length > 0) return;

    // Create an invoice complex.
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
      .leftJoin('event', 'event', 'event.id = booking.eventId')
      .leftJoin('venue', 'venue', 'venue.id = event.venueId')
      .select([
        'booking.id AS id',
        'booking.venueId AS venueId',
        'booking.subcategoryId AS subcategoryId',
        'ent.id AS entertainerId',
        'event.id AS eventId',
        'event.eventStartDateTime AS eventStartDateTime',
        'event.eventEndDateTime AS eventEndDateTime',
        'venue.timezone AS timezone',
      ])
      .where('booking.eventId IN (:...eventIds)', { eventIds })

      .andWhere('booking.status = :status', { status: 'confirmed' })
      .getRawMany();

    const bookingWithMarkup = await Promise.all(
      bookings.map(async (book) => {
        let newPricePerHour: number;
        let pricePerExtra30Min: number;

        // First fetch Entertainer Admin Rate  Card (New Rate Card Logic)

        const adminRateCard = await this.adminRateCardRepository.find();
        const zonedDate = utcToZonedTime(
          book.eventStartDateTime,
          book.timezone ?? 'UTC',
        );

        const specialRateCard = await this.specialRateCardRepository.find({
          where: {
            date: tzFormat(zonedDate, 'yyyy-MM-dd', {
              timeZone: book.timeZone ?? 'UTC',
            }),
          },
        });

        // If special rate card is available then use it otherwise use admin rate card.

        if (specialRateCard?.length > 0) {
          const rateCard = specialRateCard.find(
            (rate) => rate.subcategoryId === book.subcategoryId,
          );

          if (rateCard) {
            newPricePerHour = rateCard.specialPrice;
            pricePerExtra30Min = rateCard.pricePerExtra30Min;
          }
        } else if (adminRateCard?.length > 0) {
          const rateCard = adminRateCard.find(
            (rate) => rate.subcategoryId === book.subcategoryId,
          );
          if (rateCard) {
            newPricePerHour = rateCard.basePrice;
            pricePerExtra30Min = rateCard.pricePerExtra30Min;
          }
        }

        if (!(newPricePerHour || pricePerExtra30Min)) return;

        return {
          ...book,
          pricePerHour: newPricePerHour,
          pricePerExtra30Min,
        };
      }),
    );

    let totalAmount = 0;

    for (const book of bookingWithMarkup) {
      // Provided Payload for calculation
      const payload = {
        eventStartDateTime: book.eventStartDateTime,
        eventEndDateTime: book.eventEndDateTime,
        pricePerHour: Number(book.pricePerHour),
        pricePerExtra30Min: Number(book.pricePerExtra30Min),
        discountInPercent: 0,
        isFixed: true,
        platformFee: 0,
      };

      const price = this.calculatingInvoiceAmount(payload);

      totalAmount += Number(price);
      // New Code for more than one .
      if (eventPrice.length === 0) {
        eventPrice.push({ id: book.eventId, eventTotal: Number(price) });
      } else {
        const existing = eventPrice.find(
          (eventRecord) => eventRecord.id === book.eventId,
        );
        if (existing) {
          existing.eventTotal += Number(price);
        } else {
          eventPrice.push({ id: book.eventId, eventTotal: Number(price) });
        }
      }
    }

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 60);

    // Function to generate new invoice number
    const newInvoiceNumber = await this.generateFreshInvoiceNumber(venue);

    const newInvoice = this.invoiceRepository.create({
      invoice_number: newInvoiceNumber, // Now for dummy purpose
      user_id: Number(venue.id),
      user_type: UserType.VENUE,
      event_id: null,
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: new Date(dueDate).toISOString().split('T')[0],
      total_amount: totalAmount,
      tax_rate: 0,
      tax_amount: 0,
      total_with_tax: totalAmount,
      status: InvoiceStatus.AWAITING_PAYMENT,
      payment_method: '',
      payment_date: null,
      booking_id: null,
      isOutdated: false,
    });

    const savedInvoice = await this.invoiceRepository.save(newInvoice);
    // No Add the details of invoice (Invoice to EventId Table )
    for (const event of confirmedEvents) {
      const matchedPrice = eventPrice.find((p) => p.id === event.id);

      const invoiceEvent = this.invEventRepository.create({
        invoiceId: savedInvoice.id,
        eventId: event.id,
        eventDate: new Date().toISOString(),
        eventPrice: Number(matchedPrice?.eventTotal),
      });

      await this.invEventRepository.save(invoiceEvent);
    }
  }
  // Generate new Invoice Number.
  async generateFreshInvoiceNumber(venue) {
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoices')
      .orderBy('invoices.id', 'DESC')
      .limit(1)
      .getOne();

    const lastInvoiceNumber = lastInvoice
      ? parseInt(lastInvoice.invoice_number.split('-')[2])
      : 1000;
    // Invoicing Sequence
    const invFormattedDate = this.formatDateForInvoice(
      new Date().toISOString(),
    );
    const newInvoiceNumber = `${invFormattedDate}-${venue.id}-${lastInvoiceNumber + 1}`;
    return newInvoiceNumber;
  }
  private async addMarkupToEntertainer(basePrice: number) {
    const res = await this.settingRepo.findOne({ where: { isActive: true } });
    if (!res) return basePrice;
    const { markupType, markupValue } = res;

    let finalPrice =
      markupType === 'fixed'
        ? basePrice + markupValue
        : basePrice + (markupValue / 100) * basePrice;
    return finalPrice;
  }

  // Regeneration Logic or Invoice By Id
  // async regenerateInvoice(id: number) {
  //   try {
  //     const eventPrice = [];

  //     const invoice = await this.invoiceRepository.findOne({
  //       where: { id, isOutdated: true },
  //     });

  //     if (!invoice) throw new BadRequestException('Invoice Not Found');

  //     // Check for invoice Event Mapping Repo
  //     const invoiceMetaData = await this.invEventRepository.find({
  //       where: { invoiceId: invoice.id },
  //       select: ['eventId'],
  //     });

  //     // Now map over it and get array of the  eventIds.
  //     const eventIds = invoiceMetaData.map((item) => Number(item.eventId));

  //     const events = await this.eventRepository.find({
  //       where: { id: In(eventIds), status: 'canceled' },
  //       select: ['id'],
  //     });

  //     if (events.length > 0) {
  //       for (const event of events) {
  //         await this.invEventRepository.delete({ eventId: event.id });
  //         const index = eventIds.indexOf(Number(event.id));
  //         if (index !== -1) {
  //           eventIds.splice(index, 1);
  //         }
  //       }
  //     }

  //     const bookings = await this.bookingRepository
  //       .createQueryBuilder('booking')
  //       .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
  //       .leftJoin('event', 'event', 'event.id = booking.eventId')
  //       .leftJoin('venue', 'venue', 'venue.id = event.venueId')

  //       .select([
  //         'booking.id AS id',
  //         'booking.venueId AS venueId',
  //         'booking.subcategoryId AS subcategoryId',
  //         'ent.id AS entertainerId',
  //         'ent.pricePerEvent AS pricePerHour',
  //         'event.id AS eventId',
  //         'event.eventStartDateTime AS eventStartDateTime',
  //         'event.eventEndDateTime AS eventEndDateTime',
  //         'venue.timezone AS timezone',
  //       ])
  //       .where('booking.eventId IN (:...eventIds)', { eventIds })

  //       .andWhere('booking.status = :status', { status: 'confirmed' })
  //       .getRawMany();

  //     // Get Rate from Api

  //     const bookingWithMarkup = await Promise.all(
  //       bookings.map(async (book) => {
  //         let newPricePerHour: number;
  //         let pricePerExtra30Min: number;

  //         const adminRateCard = await this.adminRateCardRepository.find();

  //         const zonedDate = utcToZonedTime(
  //           book.eventStartDateTime,
  //           book.timezone ?? 'UTC',
  //         );

  //         const specialRateCard = await this.specialRateCardRepository.find({
  //           where: {
  //             date: tzFormat(zonedDate, 'yyyy-MM-dd', {
  //               timeZone: book.timeZone ?? 'UTC',
  //             }),
  //           },
  //         });

  //         // If special rate card is available then use it otherwise use admin rate card.

  //         if (specialRateCard?.length > 0) {
  //           const rateCard = specialRateCard.find(
  //             (rate) => rate.subcategoryId === book.subcategoryId,
  //           );

  //           if (rateCard) {
  //             newPricePerHour = rateCard.specialPrice;
  //             pricePerExtra30Min = rateCard.pricePerExtra30Min;
  //           }
  //         } else if (adminRateCard?.length > 0) {
  //           const rateCard = adminRateCard.find(
  //             (rate) => rate.subcategoryId === book.subcategoryId,
  //           );
  //           if (rateCard) {
  //             newPricePerHour = rateCard.basePrice;
  //             pricePerExtra30Min = rateCard.pricePerExtra30Min;
  //           }
  //         }

  //         if (!(newPricePerHour || pricePerExtra30Min)) return;

  //         return {
  //           ...book,
  //           pricePerHour: newPricePerHour,
  //           pricePerExtra30Min,
  //         };
  //       }),
  //     );
  //     let totalAmount = 0;

  //     for (const book of bookingWithMarkup) {
  //       // Provided Payload for calculation
  //       const payload = {
  //         eventStartDateTime: book.eventStartDateTime,
  //         eventEndDateTime: book.eventEndDateTime,
  //         pricePerHour: Number(book.pricePerHour),
  //         pricePerExtra30Min: Number(book.pricePerExtra30Min),
  //         discountInPercent: 0,
  //         isFixed: true,
  //         platformFee: 0,
  //       };
  //       const price = this.calculatingInvoiceAmount(payload);
  //       // Add to array (Because we need to update mapping)
  //       if (eventPrice.length === 0) {
  //         eventPrice.push({ id: book.eventId, eventTotal: Number(price) });
  //       } else {
  //         const existing = eventPrice.find(
  //           (eventRecord) => eventRecord.id === book.eventId,
  //         );
  //         if (existing) {
  //           existing.eventTotal += Number(price);
  //         } else {
  //           eventPrice.push({ id: book.eventId, eventTotal: Number(price) });
  //         }
  //       }
  //       totalAmount += Number(price);
  //     }

  //     // Issue Date and Due Date
  //     const issueDate = new Date();
  //     const dueDate = new Date(issueDate);
  //     dueDate.setDate(dueDate.getDate() + 60);

  //     const updatePayload = {
  //       total_with_tax: totalAmount + Number(invoice.tax_rate || 0),
  //       total_amount: totalAmount,
  //       isOutdated: false,
  //       isRegenerated: true,
  //       issue_date: issueDate.toISOString().split('T')[0],
  //       due_date: new Date(dueDate).toISOString().split('T')[0],
  //     };

  //     await this.invoiceRepository.update({ id: invoice.id }, updatePayload);

  //     // Also update the mapping table (Nothing stale)

  //     for (const event of eventIds) {
  //       const matchedPrice = eventPrice.find((p) => p.id === event);
  //       const invoiceEvent = await this.invEventRepository.update(
  //         { eventId: event },
  //         { eventPrice: Number(matchedPrice?.eventTotal) },
  //       );
  //     }

  //     return { message: 'Invoice regenerated successfully', status: true };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  async regenerateInvoice(id: number) {
    try {
      const eventPrice: { id: number; eventTotal: number }[] = [];

      // Step 1: Find outdated invoice
      const invoice = await this.invoiceRepository.findOne({
        where: { id, isOutdated: true },
      });

      if (!invoice) throw new BadRequestException('Invoice Not Found');

      // Step 2: Get all events linked to that invoice
      const invoiceMetaData = await this.invEventRepository.find({
        where: { invoiceId: invoice.id },
        select: ['eventId'],
      });

      const eventIds = invoiceMetaData.map((item) => Number(item.eventId));

      // Step 3: Remove canceled events (if any)
      const canceledEvents = await this.eventRepository.find({
        where: { id: In(eventIds), status: 'canceled' },
        select: ['id'],
      });

      if (canceledEvents.length > 0) {
        for (const event of canceledEvents) {
          await this.invEventRepository.delete({ eventId: event.id });
          const index = eventIds.indexOf(event.id);
          if (index !== -1) eventIds.splice(index, 1);
        }
      }

      if (eventIds.length === 0)
        throw new BadRequestException(
          'No active events found for this invoice.',
        );

      // Step 4: Fetch all bookings + category/subcategory mappings
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('entertainers', 'ent', 'ent.id = booking.entId')
        .leftJoin('event', 'event', 'event.id = booking.eventId')
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin(
          'booking_category_subcategory',
          'bcs',
          'bcs.booking_id = booking.id',
        )
        .leftJoin('categories', 'category', 'category.id = bcs.category_id')
        .leftJoin(
          'categories',
          'subcategory',
          'subcategory.id = bcs.subcategory_id',
        )
        .select([
          'booking.id AS id',
          'booking.venueId AS venueId',
          'event.id AS eventId',
          'event.eventStartDateTime AS eventStartDateTime',
          'event.eventEndDateTime AS eventEndDateTime',
          'venue.timezone AS timezone',
          'ent.id AS entertainerId',
          'ent.pricePerEvent AS pricePerHour',
          'category.id AS categoryId',
          'subcategory.id AS subCategoryId',
        ])
        .where('booking.eventId IN (:...eventIds)', { eventIds })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['confirmed', 'completed'],
        })
        .getRawMany();

      if (!bookings.length)
        throw new BadRequestException(
          'No confirmed bookings found for invoice.',
        );

      // Step 5: Apply rate cards per (booking × subcategory)
      const adminRateCard = await this.adminRateCardRepository.find();

      const bookingWithMarkup = await Promise.all(
        bookings.map(async (book) => {
          let newPricePerHour: number;
          let pricePerExtra30Min: number;

          const zonedDate = utcToZonedTime(
            book.eventStartDateTime,
            book.timezone ?? 'UTC',
          );

          const specialRateCard = await this.specialRateCardRepository.find({
            where: {
              date: tzFormat(zonedDate, 'yyyy-MM-dd', {
                timeZone: book.timezone ?? 'UTC',
              }),
            },
          });

          // Prefer special rate if available
          if (specialRateCard?.length > 0) {
            const rateCard = specialRateCard.find(
              (rate) => rate.subcategoryId === book.subCategoryId,
            );
            if (rateCard) {
              newPricePerHour = rateCard.specialPrice;
              pricePerExtra30Min = rateCard.pricePerExtra30Min;
            }
          }

          // Fallback to admin rate card
          if (
            !(newPricePerHour || pricePerExtra30Min) &&
            adminRateCard?.length > 0
          ) {
            const rateCard = adminRateCard.find(
              (rate) => rate.subcategoryId === book.subCategoryId,
            );
            if (rateCard) {
              newPricePerHour = rateCard.basePrice;
              pricePerExtra30Min = rateCard.pricePerExtra30Min;
            }
          }

          if (!(newPricePerHour || pricePerExtra30Min)) return null;

          return {
            ...book,
            pricePerHour: newPricePerHour,
            pricePerExtra30Min,
          };
        }),
      );

      // Step 6: Calculate total invoice amount
      let totalAmount = 0;

      for (const book of bookingWithMarkup.filter(Boolean)) {
        const payload = {
          eventStartDateTime: book.eventStartDateTime,
          eventEndDateTime: book.eventEndDateTime,
          pricePerHour: Number(book.pricePerHour),
          pricePerExtra30Min: Number(book.pricePerExtra30Min),
          discountInPercent: 0,
          isFixed: true,
          platformFee: 0,
        };

        const price = this.calculatingInvoiceAmount(payload);

        // Aggregate per event
        const existing = eventPrice.find((e) => e.id === book.eventId);
        if (existing) {
          existing.eventTotal += Number(price);
        } else {
          eventPrice.push({ id: book.eventId, eventTotal: Number(price) });
        }

        totalAmount += Number(price);
      }

      // Step 7: Update invoice totals
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 60);

      const updatePayload = {
        total_with_tax: totalAmount + Number(invoice.tax_rate || 0),
        total_amount: totalAmount,
        isOutdated: false,
        isRegenerated: true,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
      };

      await this.invoiceRepository.update({ id: invoice.id }, updatePayload);

      // Step 8: Update event-invoice mapping amounts
      for (const event of eventIds) {
        const matchedPrice = eventPrice.find((p) => p.id === event);
        await this.invEventRepository.update(
          { eventId: event },
          { eventPrice: Number(matchedPrice?.eventTotal ?? 0) },
        );
      }

      return { message: 'Invoice regenerated successfully', status: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async getVenueInvoices(page: number, pageSize: number, search, role: string) {
    try {
      const skip = (page - 1) * pageSize;
      const baseQuery = this.invoiceRepository
        .createQueryBuilder('invoices')
        .leftJoin('venue', 'venue', 'venue.id = invoices.user_id')
        .leftJoin('users', 'user', 'user.id = venue.userId')
        .leftJoin('states', 'state', 'state.id = venue.state')
        .leftJoin('countries', 'country', 'country.id = venue.country')
        .leftJoin('cities', 'city', 'city.id = venue.city')
        .leftJoin('StateCodeUSA', 'code', 'code.id = state.id')
        .where('invoices.user_type = :role', { role });

      // Add search condition
      if (search) {
        baseQuery.andWhere(
          'LOWER(invoices.invoice_number) LIKE LOWER(:search)',
          {
            search: `%${search}%`,
          },
        );
      }

      // Get total count first
      const total = await baseQuery.getCount();

      // Get paginated records using limit and offset
      const records = await baseQuery
        .select([
          'invoices.*',
          'venue.name AS venueName',
          'venue.addressLine1 AS venueAddressLine1',
          'venue.addressLine2 AS venueAddressLine2',
          'venue.contactPerson As contactPerson',
          'venue.contactNumber As contactNumber',
          'venue.email AS venueEmail',
          'user.email AS userEmail',
          'state.name AS stateName',
          'city.name AS cityName',
          'code.stateCode AS StateCode',
          `(
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'slug', e.slug,
      'title', e.title,
      'eventId', e.id,
      'eventStartDateTime', e.eventStartDateTime,
      'eventEndDateTime', e.eventEndDateTime,
     'amount', ie.event_price
    )
  )
  FROM invoice_events ie
  JOIN event e ON e.id = ie.event_id
  WHERE ie.invoice_id = invoices.id
) AS events
`,
        ])
        .orderBy('invoices.id', 'DESC')
        .limit(pageSize)
        .offset(skip)
        .getRawMany();

      const parsedResults = records.map(({ events, ...rest }) => {
        return {
          ...rest,
          events: events
            ? JSON.parse(events).map(
                ({ eventStartDateTime, eventEndDateTime, ...rest }) => {
                  return {
                    ...rest,
                    duration: this.getDurationInHours(
                      eventStartDateTime,
                      eventEndDateTime,
                    ),
                  };
                },
              )
            : [], // Parse JSON string to object
        };
      });

      return {
        message: 'Invoices fetched successfully',
        records: parsedResults,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
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

  async sendInvoiceWithPdf(pdfBuffer: Buffer, invoiceId: number) {
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('venue', 'venue', 'venue.id = invoice.user_id')
      .leftJoin('users', 'user', 'user.id = venue.userId')
      .select([
        'invoice.id AS invoiceId',
        'invoice.issue_date AS issueDate',
        'user.email AS userEmail',
        'venue.name AS venueName',
        'venue.email As venueEmail',
      ])
      .where('invoice.id =:invoiceId', { invoiceId })
      .getRawOne();

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!(invoice.userEmail || invoice.venueEmail))
      throw new NotFoundException('Email not Found');

    const date = new Date();
    const month = format(new Date(invoice.issueDate), 'LLLL');
    // Email Sending
    const emailPayload = {
      to: invoice.userEmail || invoice.venueEmail,
      subject: 'Monthly combined invoice for events.',
      templateName: 'invoice-email.html',
      replacements: {
        venueName: invoice.venueName,
        month,
      },
      attachments: [
        {
          filename: `invoice_${month}_${date.getFullYear()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await this.emailService.handleSendEmail(emailPayload);

    // Updating invoice entity
    await this.invoiceRepository.update(
      { id: invoiceId },
      { isSent: true, sentDate: new Date() },
    );

    return { message: 'Invoice sent successfully', status: true };
  }

  async sendPendingInvoices(page: number = 1, pageSize: number = 100) {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const invoices = await this.invoiceRepository.find({
      where: {
        created_at: Between(start, end),
        isSent: false,
        isOutdated: false,
      },
      select: ['id'],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (invoices.length === 0) {
      return;
    }

    for (const invoice of invoices) {
      await this.sendInvoice(invoice.id);
    }
  }

  async getCalculatedAmount(
    entertainerId: number,
    eventId: number,
    durationInHours: number,
  ) {
    const rateCard = await this.getEntertainerRateCard(Number(entertainerId));

    const adminRateCard = await this.adminRateCardRepository.find({});
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

  async getEntertainerRateCard(entertainerId: number) {
    try {
      const rateCard = await this.entertainerRateCard.find({
        where: { entertainerId },
        select: ['subcategoryId', 'basePrice', 'pricePerExtra30Min', 'id'],
      });

      if (!rateCard) return null;
      return rateCard;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
