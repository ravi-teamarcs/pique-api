import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserType {
  ENTERTAINER = 'entertainer',
  VENUE = 'venue',
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  invoice_number: string;

  @Column()
  entertainer_id: number; // Refers to the entertainer or venue user ID

  @Column()
  venue_id: number;

  @Column()
  event_id: number;

  @Column({ type: 'enum', enum: UserType })
  user_type: UserType; // Entertainer or venue

  @Column({ type: 'date' })
  issue_date: string;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  tax_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_with_tax: number;


  @Column({ type: 'enum', enum: InvoiceStatus })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 255 })
  payment_method: string;

  @Column({ type: 'date', nullable: true })
  payment_date: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
