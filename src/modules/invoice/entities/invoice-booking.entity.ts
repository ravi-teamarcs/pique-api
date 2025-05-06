import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_bookings')
export class InvoiceBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_id' })
  invoiceId: number;

  @Column({ name: 'booking_id' })
  bookingId: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @CreateDateColumn()
  created_at: Date;
}
