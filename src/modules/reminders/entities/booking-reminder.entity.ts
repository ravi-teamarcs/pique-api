import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('booking_reminders')
export class BookingReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @Column({ name: 'venue_id' })
  venueId: number;

  @Column({ name: 'entertainer_id' })
  entId: number;

  @Column({ default: false })
  isOneHourEmailSent: boolean;

  @Column({ default: false })
  isTwentyFourHourEmailSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
