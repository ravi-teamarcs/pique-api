import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Invoice } from '../invoice/entities/invoices.entity';
import { Event } from '../events/entities/event.entity';
import { Report } from './dto/report.dto';

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
}
