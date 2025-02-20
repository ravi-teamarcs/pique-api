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

  @Column({ type: 'int' })
  bookingId: number; // References the booking

  @Column({ type: 'int', nullable: true })
  venueId: number; // Optional, references the venue

  @Column({ type: 'int', nullable: true })
  entertainerId: number; // Optional, references the entertainer
  @Column()
  userId: number; // References the user

  @Column({ nullable: false })
  eventId: number;
  @Column({
    type: 'enum',
    enum: [
      'pending',
      'confirmed',
      'accepted',
      'cancelled',
      'rejected',
      'completed',
      'rescheduled',
    ],
    default: 'pending',
  })
  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'rejected'
    | 'completed'
    | 'rescheduled';

  @Column({ type: 'time' })
  showTime: string;

  @Column({ type: 'date' })
  showDate: string;

  @Column()
  specialNotes: string;

  @Column()
  Date: Date;

  @Column()
  performedBy: 'venue' | 'entertainer';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
