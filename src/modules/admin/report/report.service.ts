import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Venue } from '../venue/Entity/venue.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Entertainer } from '../entertainer/Entitiy/entertainer.entity';
import { Invoice } from '../invoice/Entity/invoices.entity';
import { Event } from '../events/Entity/event.entity';
@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(Event) private eventRepo: Repository<Event>,
        @InjectRepository(Venue) private venueRepo: Repository<Venue>,
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        @InjectRepository(Entertainer) private entertainerRepo: Repository<Entertainer>,
        @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    ) { }

    async getAllEventData() {
        const events = await this.eventRepo.find();
        const eventData = await Promise.all(events.map(async (event) => {
            const venue = await this.venueRepo.findOne({ where: { id: event.venueId } });
            const bookings = await this.bookingRepo.find({ where: { eventId: event.id }, order: { id: "DESC" } });

            const bookingsWithEntertainers = await Promise.all(
                bookings.map(async (booking) => {
                    // Fetch the entertainer linked to the booking
                    const entertainer = await this.entertainerRepo.findOne({
                        where: { user: { id: booking.entertainerUser?.id } },
                        relations: ['user'],
                    });

                    // Ensure that we only query invoices when an entertainer is found
                    const invoices = entertainer
                        ? await this.invoiceRepo.find({ where: { entertainer_id: entertainer.id },order: { id: "DESC" } })
                        : [];

                    return { ...booking, entertainer, invoices };
                })
            );

            return {
                ...event,
                venue,
                bookings: bookingsWithEntertainers,
            };

        }));

        return eventData;
    }


}
