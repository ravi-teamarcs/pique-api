import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { truncate } from 'fs';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['soloist', 'duo', 'trio', 'ensemble'],
    nullable: true,
  })
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

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
      'cancelled',
      'completed',
      'rescheduled',
      'declined',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'cancelled'
    | 'accepted'
    | 'completed'
    | 'rescheduled'
    | 'declined';

  @Column({ type: 'time' })
  showTime: Date;

  @Column({ type: 'date' })
  showDate: Date;

  @Column({ nullable: true })
  specialNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
