import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Event } from '../events/entities/event.entity';
import { Report } from './dto/report.dto';
import { DownloadReport } from './dto/generate-report.dto';
import * as stream from 'stream';
import * as XLSX from 'xlsx';
import { Response } from 'express';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Venue) private venueRepo: Repository<Venue>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Entertainer)
    private entertainerRepo: Repository<Entertainer>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
  ) {}

  async getAllEventData() {
    const page = 1;
    const skip = 10;

    const events = await this.eventRepo.find();
    const eventData = await Promise.all(
      events.map(async (event) => {
        const venue = await this.venueRepo.findOne({
          where: { id: event.venueId },
        });
        const bookings = await this.bookingRepo.find({
          where: { eventId: event.id },
          order: { id: 'DESC' },
        });

        const bookingsWithEntertainers = await Promise.all(
          bookings.map(async (booking) => {
            // Fetch the entertainer linked to the booking
            const entertainer = await this.entertainerRepo.findOne({
              where: { user: { id: booking.entertainerUser?.id } },
              relations: ['user'],
            });

            // Ensure that we only query invoices when an entertainer is found
            const invoices = entertainer
              ? await this.invoiceRepo.find({
                  where: { entertainer_id: entertainer.id },
                  order: { id: 'DESC' },
                })
              : [];

            return { ...booking, entertainer, invoices };
          }),
        );

        return {
          ...event,
          venue,
          bookings: bookingsWithEntertainers,
        };
      }),
    );

    return eventData;
  }

  async getEventData(query: Report) {
    const { page = 1, limit = 10, from, to, search = '' } = query;

    try {
      const currentDate = new Date();

      let fromDate: Date, toDate: Date;

      if (from) {
        const [fromYear, fromMonth] = from.split('-').map(Number);
        fromDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0);
      } else {
        // Default: First day of the current month
        fromDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
          0,
          0,
          0,
        );
      }

      if (to) {
        const [toYear, toMonth] = to.split('-').map(Number);

        if (
          toYear === currentDate.getFullYear() &&
          toMonth === currentDate.getMonth() + 1
        ) {
          // If the `to` month is the current month, return data only until today
          toDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23,
            59,
            59,
          );
        } else {
          // Otherwise, return the last day of the selected `to` month
          toDate = new Date(toYear, toMonth, 0, 23, 59, 59);
        }
      } else {
        // Default: Current date (today)
        toDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          23,
          59,
          59,
        );
      }

      const take = (page - 1) * limit;

      const res = this.eventRepo
        .createQueryBuilder('event')
        .select([
          'event.id AS event_id',
          'event.title AS event_title',
          'event.location AS event_location',
          'event.userId AS event_userId',
          'event.venueId AS event_venueId',
          'event.description AS event_description',
          'event.startTime AS event_startTime',
          'event.endTime AS event_endTime',
          'event.recurring AS event_recurring',
          'event.status AS event_status',

          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine1 AS venue_addressLine2',

          'booking.id AS booking_id',
          'booking.status AS booking_status',
          'booking.entertainerUserId AS booking_eid',

          'entertainer.id AS entertainer_id',
          'entertainer.name AS entertainer_name',
          'entertainer.bio AS entertainer_bio',

          'invoice.id AS ent_invoice_id',
          'invoice.total_with_tax AS ent_total_amount',
          'invoice.status AS ent_invoice_status',
          'invoice.invoice_number AS ent_invoice_number',
          'invoice.payment_method AS ent_payment_method',
          'invoice.payment_date AS ent_payment_date',

          'inv.id AS venue_invoice_id',
          'inv.total_with_tax AS venue_total_amount',
          'inv.status AS venue_invoice_status',
          'inv.invoice_number AS venue_invoice_number',
          'inv.payment_method AS venue_payment_method',
          'inv.payment_date AS venue_payment_date',

          'log.venue_confirmation_date',
          'log.entertainer_confirmation_date',
        ])
        .where('event.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('event.status = :status', { status: 'completed' })
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('booking', 'booking', 'booking.eventId = event.id')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.userId = booking.entertainerUserId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin(
          'invoices',
          'invoice',
          'invoice.user_id = booking.entertainerUserId',
        )
        .leftJoin('invoices', 'inv', 'inv.user_id = booking.venueUserId')
        .leftJoin(
          (qb) =>
            qb
              .select('booking_log.bookingId', 'bookingId')
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'venue' AND booking_log.status = 'confirmed' THEN booking_log.createdAt ELSE NULL END)",
                'venue_confirmation_date',
              )
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'entertainer' AND booking_log.status = 'accepted' THEN booking_log.createdAt ELSE NULL END)",
                'entertainer_confirmation_date',
              )
              .from('booking_log', 'booking_log')
              .groupBy('booking_log.bookingId'),
          'log',
          'log.bookingId = booking.id',
        );

      if (search) {
        res.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
          search: `%${search}%`,
        });
      }

      // Fetch paginated results
      const eventDetails = await res
        .orderBy('event.createdAt', 'DESC')
        .limit(limit)
        .offset(take) // ✅ Use `offset` instead of `take` for raw queries
        .getRawMany();

      // Get total count of completed events in the selected date range
      const totalCountResult = await this.eventRepo
        .createQueryBuilder('event')
        .select('COUNT(*)', 'count') // ✅ Count all rows, including duplicates
        .where('event.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('event.status = :status', { status: 'completed' })
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('booking', 'booking', 'booking.eventId = event.id')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.userId = booking.entertainerUserId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin(
          'invoices',
          'invoice',
          'invoice.user_id = booking.entertainerUserId',
        )
        .leftJoin('invoices', 'inv', 'inv.user_id = booking.venueUserId')
        .getRawOne();

      const totalCount = parseInt(totalCountResult.count, 10); // ✅ Get total row count

      return {
        data: eventDetails,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error getting event Data',
        error: error.message,
        status: false,
      });
    }
  }

  // async generateReport(dto: DownloadReport, res: Response): Promise<void> {
  //   const { data } = await this.fetchReportFromDB(dto);

  //   // Sort events by date
  //   data.sort(
  //     (a, b) =>
  //       new Date(a.event_startTime).getTime() -
  //       new Date(b.event_startTime).getTime(),
  //   );

  //   // Group events by month
  //   const groupedData: { [key: string]: any[] } = {};

  //   data.forEach((event) => {
  //     const month = new Date(event.event_startTime).toLocaleString('en-GB', {
  //       month: 'long',
  //       year: 'numeric',
  //     });
  //     if (!groupedData[month]) groupedData[month] = [];
  //     groupedData[month].push(event);
  //   });

  //   const excelData: any[][] = [];

  //   // Add empty rows for spacing
  //   excelData.push([], [], []);

  //   // Add Annual Report heading
  //   excelData.push(['Annual Report']);
  //   excelData.push([]); // Empty row for spacing

  //   // Iterate through grouped data
  //   Object.keys(groupedData).forEach((month) => {
  //     excelData.push([month]); // Month Header
  //     excelData.push([
  //       'SrNo',
  //       'Date',
  //       'Time',
  //       'Event',
  //       'Location',
  //       'Entertainer',
  //       'Location Confirmation',
  //       'Entertainer Confirmation',
  //       'Venue Inv No',
  //       'Amount',
  //       'Payment Status',
  //       'Payment Date',
  //       'Payment Method',
  //       'Cheque/DD NO',
  //       'Ent Invoice',
  //       'Ent Payment',
  //       'Ent Payment Status',
  //       'Ent Payment Date',
  //       'Ent Payment Method',
  //       'Ent Cheque/No.',
  //     ]); // Column Headers

  //     groupedData[month].forEach((event, index) => {
  //       excelData.push([
  //         index + 1,
  //         event.event_startTime
  //           ? new Date(event.event_startTime)
  //               .toLocaleDateString('en-GB', {
  //                 day: '2-digit',
  //                 month: 'short',
  //                 year: 'numeric',
  //               })
  //               .toUpperCase()
  //               .replace(/\s/g, '-')
  //           : '',
  //         event.event_startTime
  //           ? new Date(event.event_startTime).toLocaleTimeString('en-US', {
  //               hour: '2-digit',
  //               minute: '2-digit',
  //               hour12: true,
  //             })
  //           : '',
  //         event.event_title || '',
  //         event.venue_name || '',
  //         event.entertainer_name || '',
  //         event.venue_confirmation_date
  //           ? new Date(event.venue_confirmation_date).toLocaleDateString(
  //               'en-GB',
  //               { day: '2-digit', month: 'short', year: 'numeric' },
  //             )
  //           : '',
  //         event.entertainer_confirmation_date
  //           ? new Date(event.entertainer_confirmation_date).toLocaleDateString(
  //               'en-GB',
  //               { day: '2-digit', month: 'short', year: 'numeric' },
  //             )
  //           : '',
  //         event.venue_invoice_number || '',
  //         event.venue_total_amount || '',
  //         event.venue_invoice_status || '',
  //         event.venue_payment_date || '',
  //         event.venue_payment_method || '',
  //         '', // Cheque/DD NO - keeping it blank
  //         event.ent_invoice_number || '',
  //         event.ent_total_amount || '',
  //         event.ent_payment_status || '',
  //         event.ent_payment_date || '',
  //         event.ent_payment_method || '',
  //         'SBI89', // Static Cheque/No. (if applicable)
  //       ]);
  //     });

  //     excelData.push([]); // Add an empty row after each month section
  //   });

  //   // Create worksheet and workbook
  //   const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  //   worksheet['!cols'] = [
  //     { wch: 5 }, // SrNo
  //     { wch: 12 }, // Date
  //     { wch: 10 }, // Time
  //     { wch: 20 }, // Event
  //     { wch: 15 }, // Location
  //     { wch: 20 }, // Entertainer
  //     { wch: 18 }, // Location Confirmation
  //     { wch: 18 }, // Entertainer Confirmation
  //     { wch: 15 }, // Venue Inv No
  //     { wch: 10 }, // Amount
  //     { wch: 15 }, // Payment Status
  //     { wch: 15 }, // Payment Date
  //     { wch: 20 }, // Payment Method ✅ (Increased width)
  //     { wch: 15 }, // Cheque/DD NO
  //     { wch: 15 }, // Ent Invoice
  //     { wch: 15 }, // Ent Payment
  //     { wch: 20 }, // Ent Payment Status
  //     { wch: 15 }, // Ent Payment Date
  //     { wch: 20 }, // Ent Payment Method ✅ (Increased width)
  //     { wch: 15 }, // Ent Cheque/No.
  //   ];

  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Annual Report');

  //   // Generate buffer instead of saving to disk
  //   const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  //   // Create a readable stream from the buffer
  //   const readStream = new stream.PassThrough();
  //   readStream.end(buffer);

  //   // Set response headers for file download
  //   res.setHeader('Content-Disposition', 'attachment; filename="Report.xlsx"');
  //   res.setHeader(
  //     'Content-Type',
  //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //   );

  //   // Stream the file to the response
  //   readStream.pipe(res);
  // }

  async generateReport(dto: DownloadReport, res: Response): Promise<void> {
    const { data } = await this.fetchReportFromDB(dto);
    const { from, to } = dto;
    // Sort events by date
    data.sort(
      (a, b) =>
        new Date(a.event_startTime).getTime() -
        new Date(b.event_startTime).getTime(),
    );

    // Group events by month
    const groupedData: { [key: string]: any[] } = {};

    data.forEach((event) => {
      const month = new Date(event.event_startTime).toLocaleString('en-GB', {
        month: 'long',
        year: 'numeric',
      });
      if (!groupedData[month]) groupedData[month] = [];
      groupedData[month].push(event);
    });
   
    // Determine filename based on event date range
    const months = Object.keys(groupedData);
    const firstMonth = months[0]?.split(' ')[0] || 'Jan';
    const lastMonth = months.slice(-1)[0]?.split(' ')[0] || 'Dec';
    const yearShort = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of the year
    const fileName = `Event Report ${firstMonth}${yearShort}-${lastMonth}${yearShort}.xlsx`;
    
    const excelData: any[][] = [];

    // Add Column Headers
    excelData.push([
      'SNo',
      'Date',
      'Time',
      'Event',
      'Location',
      'Entertainer',
      'Location Confirmation',
      'Entertainer Confirmation',
      'Venue Inv No',
      'Amount',
      'Payment Status',
      'Payment Date',
      'Payment Method',
      'Cheque/DD No',
      'Ent Invoice',
      'Ent Payment',
      'Ent Payment Status',
      'Ent Payment Date',
      'Ent Payment Method',
      'Ent Cheque/DD No',
    ]);

    // Iterate through grouped data
    Object.keys(groupedData).forEach((month) => {
      groupedData[month].forEach((event, index) => {
        excelData.push([
          index + 1,
          event.event_startTime
            ? new Date(event.event_startTime)
                .toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
                .toUpperCase()
                .replace(/\s/g, '-')
            : '',
          event.event_startTime
            ? new Date(event.event_startTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : '',
          event.event_title?.trim() || '',
          event.venue_name?.trim() || '',
          event.entertainer_name?.trim() || '',
          event.venue_confirmation_date
            ? new Date(event.venue_confirmation_date).toLocaleDateString(
                'en-GB',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                },
              )
            : '',
          event.entertainer_confirmation_date
            ? new Date(event.entertainer_confirmation_date).toLocaleDateString(
                'en-GB',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                },
              )
            : '',
          event.venue_invoice_number || '',
          event.venue_total_amount || '',
          event.venue_invoice_status || '',
          event.venue_payment_date || '',
          event.venue_payment_method || '',
          '', // Cheque/DD NO
          event.ent_invoice_number || '',
          event.ent_total_amount || '',
          event.ent_payment_status || '',
          event.ent_payment_date || '',
          event.ent_payment_method || '',
          '', // Cheque/DD NO
        ]);
      });
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths for better formatting
    worksheet['!cols'] = [
      { wch: 5 }, // SrNo
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 20 }, // Event
      { wch: 15 }, // Location
      { wch: 20 }, // Entertainer
      { wch: 18 }, // Location Confirmation
      { wch: 18 }, // Entertainer Confirmation
      { wch: 15 }, // Venue Inv No
      { wch: 10 }, // Amount
      { wch: 15 }, // Payment Status
      { wch: 15 }, // Payment Date
      { wch: 20 }, // Payment Method
      { wch: 15 }, // Cheque/DD NO
      { wch: 15 }, // Ent Invoice
      { wch: 15 }, // Ent Payment
      { wch: 20 }, // Ent Payment Status
      { wch: 15 }, // Ent Payment Date
      { wch: 20 }, // Ent Payment Method
      { wch: 15 }, // Ent Cheque/No.
    ];

    // Apply bold formatting to header row
    for (let col = 0; col <= 19; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'CCCCCC' } }, // Light gray background
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Event Report');

    // Generate buffer instead of saving to disk
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create a readable stream from the buffer
    const readStream = new stream.PassThrough();
    readStream.end(buffer);
    console.log('Grouped Data', groupedData);
    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Stream the file to the response
    readStream.pipe(res);
  }

  async fetchReportFromDB(dto: DownloadReport) {
    const { from, to } = dto;

    try {
      const currentDate = new Date();
      let fromDate: Date, toDate: Date;

      if (from) {
        const [fromYear, fromMonth] = from.split('-').map(Number);
        fromDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0);
      } else {
        // Default: First day of the current month
        fromDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
          0,
          0,
          0,
        );
      }

      if (to) {
        const [toYear, toMonth] = to.split('-').map(Number);

        if (
          toYear === currentDate.getFullYear() &&
          toMonth === currentDate.getMonth() + 1
        ) {
          // If the `to` month is the current month, return data only until today
          toDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23,
            59,
            59,
          );
        } else {
          // Otherwise, return the last day of the selected `to` month
          toDate = new Date(toYear, toMonth, 0, 23, 59, 59);
        }
      } else {
        // Default: Current date (today)
        toDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          23,
          59,
          59,
        );
      }

      const reportData = await this.eventRepo
        .createQueryBuilder('event')
        .select([
          'event.id AS event_id',
          'event.title AS event_title',
          'event.location AS event_location',
          'event.userId AS event_userId',
          'event.venueId AS event_venueId',
          'event.description AS event_description',
          'event.startTime AS event_startTime',
          'event.endTime AS event_endTime',
          'event.recurring AS event_recurring',
          'event.status AS event_status',

          'venue.id AS venue_id',
          'venue.name AS venue_name',
          'venue.addressLine1 AS venue_addressLine1',
          'venue.addressLine1 AS venue_addressLine2',

          'booking.id AS booking_id',
          'booking.status AS booking_status',
          'booking.entertainerUserId AS booking_eid',

          'entertainer.id AS entertainer_id',
          'entertainer.name AS entertainer_name',
          'entertainer.bio AS entertainer_bio',

          'invoice.id AS ent_invoice_id',
          'invoice.total_with_tax AS ent_total_amount',
          'invoice.status AS ent_invoice_status',
          'invoice.invoice_number AS ent_invoice_number',
          'invoice.payment_method AS ent_payment_method',
          'invoice.payment_date AS ent_payment_date',

          'inv.id AS venue_invoice_id',
          'inv.total_with_tax AS venue_total_amount',
          'inv.status AS venue_invoice_status',
          'inv.invoice_number AS venue_invoice_number',
          'inv.payment_method AS venue_payment_method',
          'inv.payment_date AS venue_payment_date',

          'log.venue_confirmation_date',
          'log.entertainer_confirmation_date',
        ])
        .where('event.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('event.status = :status', { status: 'completed' })
        .leftJoin('venue', 'venue', 'venue.id = event.venueId')
        .leftJoin('booking', 'booking', 'booking.eventId = event.id')
        .leftJoin(
          'entertainers',
          'entertainer',
          'entertainer.userId = booking.entertainerUserId',
        )
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .leftJoin(
          'invoices',
          'invoice',
          'invoice.user_id = booking.entertainerUserId',
        )
        .leftJoin('invoices', 'inv', 'inv.user_id = booking.venueUserId')
        .leftJoin(
          (qb) =>
            qb
              .select('booking_log.bookingId', 'bookingId')
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'venue' AND booking_log.status = 'confirmed' THEN booking_log.createdAt ELSE NULL END)",
                'venue_confirmation_date',
              )
              .addSelect(
                "MAX(CASE WHEN booking_log.performedBy = 'entertainer' AND booking_log.status = 'accepted' THEN booking_log.createdAt ELSE NULL END)",
                'entertainer_confirmation_date',
              )
              .from('booking_log', 'booking_log')
              .groupBy('booking_log.bookingId'),
          'log',
          'log.bookingId = booking.id',
        )
        .addOrderBy('event.createdAt', 'DESC')
        .getRawMany();
      return {
        message: 'Report Data returned Successfully',
        data: reportData,
        status: false,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: false,
      });
    }
  }
}
