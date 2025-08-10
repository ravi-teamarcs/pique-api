import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  venueId: number;

  @Column({ nullable: false })
  entId: number;

  @Column({ nullable: false })
  eventId: number;

  @Column({
    type: 'enum',
    enum: [
      'invited',
      'confirmed',
      'applied',
      'canceled',
      'declined',
      'completed',
      'rescheduled',
      'removed',
      'closed',
      'reinvited',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'canceled'
    | 'declined'
    | 'completed'
    | 'applied'
    | 'rescheduled'
    | 'closed'
    | 'reinvited'
    | 'removed';

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id' })
  subcategoryId: number;

  // Also Add the new column
  @Column({ type: 'timestamp' })
  showStartDateTime: Date;

  @Column({ nullable: true })
  specialNotes: string;

  @Column({ default: false })
  emailSentOnClose: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
