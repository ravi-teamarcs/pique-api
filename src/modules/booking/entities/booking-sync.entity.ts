import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class BookingCalendarSync {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  userId: number;

  @Column({ nullable: true, default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isSynced: boolean;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date;

  @Column({ nullable: true })
  calendarEventId: string; // Google Calendar Event ID
}
