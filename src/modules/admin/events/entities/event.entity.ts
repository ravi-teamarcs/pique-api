import { Venue } from 'src/modules/venue/entities/venue.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('event')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  venueId: number;

  @Column({ nullable: true })
  sub_venue_id: number;

  @Column({ type: 'text' })
  slug: string;
  @Column()
  description: string;

  @Column({ type: 'time' })
  startTime: Date;

  @Column({ type: 'time' })
  endTime: Date;

  @Column({ type: 'date' })
  eventDate: Date;

  @Column({
    type: 'enum',
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  })
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';

  @Column({
    type: 'enum',
    enum: [
      'unpublished',
      'published',
      'confirmed',
      'cancelled',
      'completed',
      'rescheduled',
    ],
    default: 'unpublished',
  })
  status:
    | 'unpublished'
    | 'rescheduled'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'published';

  @Column({ type: 'boolean', default: true })
  isAdmin: boolean;

  // events.entity.ts

  @Column({ default: false })
  emailSentAfter1Hour: boolean;

  @Column({ default: false })
  emailSentAfter24Hour: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
