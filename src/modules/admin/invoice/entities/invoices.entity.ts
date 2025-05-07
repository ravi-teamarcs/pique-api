import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserType {
  ENTERTAINER = 'entertainer',
  VENUE = 'venue',
}
export enum InvoiceStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  PAYMENTSENT = 'paymentsent',
  INVOICE_TO_BE_SENT = 'invoice to be send',
  AWAITING_PAYMENT = 'awaiting payment',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  invoice_number: string;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  event_id: number;

  @Column({ type: 'enum', enum: UserType })
  user_type: UserType; // Entertainer or venue

  @Column({ type: 'date' })
  issue_date: string;

  @Column({ type: 'date', nullable: true })
  due_date: string;

  @Column({ type: 'decimal' })
  total_amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  tax_rate: number;

  @Column({ type: 'decimal' })
  tax_amount: number;

  @Column({ type: 'decimal' })
  total_with_tax: number;

  @Column({
    type: 'enum',
    enum: [
      'unpaid',
      'paid',
      'paymentsent',
      'invoice to be send',
      'awaiting payment',
    ],
    default: 'unpaid',
  })
  status:
    | 'paid'
    | 'paymentsent'
    | 'invoice to be send'
    | 'awaiting payment'
    | 'unpaid';

  @Column({ type: 'varchar', length: 255 })
  payment_method: string;

  @Column({ type: 'date', nullable: true })
  payment_date: string;

  @Column({ nullable: true })
  booking_id: number;

  @Column({ nullable: true })
  overdue: number;

  @Column({ nullable: true, name: 'cheque_no' })
  chequeNo: string;

  @Column({ nullable: true, name: 'inv_amount_paid' })
  invAmountPaid: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
