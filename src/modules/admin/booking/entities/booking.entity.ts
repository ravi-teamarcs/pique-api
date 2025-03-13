import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/Entity/users.entity';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.venueBookings)
  venueUser: User;

  @ManyToOne(() => User, (user) => user.entertainerBookings)
  entertainerUser: User;

  @Column({ nullable: false })
  venueId: number;

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
  showTime: Date;

  @Column({ type: 'date' })
  showDate: Date;

  @Column({
    type: 'enum',
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending',
  })
  isAccepted: 'accepted' | 'rejected' | 'pending';

  @Column()
  specialNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  statusDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  isAcceptedDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
