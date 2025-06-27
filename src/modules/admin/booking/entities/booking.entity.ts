import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';

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
      'canceled',
      'completed',
      'rescheduled',
      'declined',
      'removed',
      'closed',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'closed'
    | 'canceled'
    | 'accepted'
    | 'completed'
    | 'rescheduled'
    | 'declined'
    | 'removed';

  @Column({ type: 'time', nullable: true })
  showTime: Date;

  @Column({ type: 'date', nullable: true })
  showDate: Date;
  //Added new Column
  @Column({ type: 'timestamp' })
  showStartDateTime: Date;

  @Column({ nullable: true })
  specialNotes: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id' })
  subcategoryId: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
