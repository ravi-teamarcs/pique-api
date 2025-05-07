import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_log') // Explicitly setting the table name
export class BookingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  user: number;

  @Column({
    type: 'enum',
    enum: [
      'invited',
      'confirmed',
      'accepted',
      'cancelled',
      'declined',

      'rescheduled',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'cancelled'
    | 'declined'
    | 'completed'
    | 'rescheduled';

  @Column()
  performedBy: 'venue' | 'entertainer' | 'admin';

  @Column()
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
