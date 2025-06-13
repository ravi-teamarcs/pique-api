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
      'accepted',
      'canceled',
      'declined',
      'completed',
      'rescheduled',
      'removed',
      'closed',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'canceled'
    | 'declined'
    | 'completed'
    | 'accepted'
    | 'rescheduled'
    | 'closed'
    | 'removed';

  @Column({ type: 'time', nullable: true })
  showTime: Date;

  @Column({ type: 'date', nullable: true })
  showDate: Date;

  // Also Add the new column
  @Column({ type: 'timestamp' })
  showStartDateTime: Date;

  @Column({ nullable: true })
  specialNotes: string;

  @Column({
    type: 'enum',
    enum: ['soloist', 'duo', 'trio', 'ensemble'],
    nullable: true,
  })
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
