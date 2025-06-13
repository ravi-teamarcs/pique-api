import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('invoice_events')
export class InvoiceEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_id' })
  invoiceId: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @Column({ type: 'timestamp', name: 'event_date' })
  eventDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'event_price' })
  eventPrice: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
