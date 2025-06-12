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

  @Column({ nullable: true })
  user: number;

  @Column({
    type: 'enum',
    enum: [
      'invited',
      'confirmed',
      'accepted',
      'canceled',
      'declined',

      'rescheduled',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'canceled'
    | 'declined'
    | 'completed'
    | 'rescheduled';

  @Column()
  performedBy: 'venue' | 'entertainer' | 'admin';

  @Column()
  date: Date;

  @CreateDateColumn({type: 'timestamp'})
  createdAt: Date;

  @UpdateDateColumn({type: 'timestamp'})
  updatedAt: Date;
}
