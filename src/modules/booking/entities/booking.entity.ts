import { User } from '../../users/entities/users.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.venueBookings, { onDelete: 'CASCADE' })
  venueUser: User;

  @ManyToOne(() => User, (user) => user.entertainerBookings, {
    onDelete: 'CASCADE',
  })
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

  @Column()
  specialNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
