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

  @Column()
  title: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  venueId: number;

  @Column({ nullable: true })
  sub_venue_id: number;

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
    enum: ['unpublished', 'scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'unpublished',
  })
  status: 'unpublished' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @Column({ type: 'boolean', default: true })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
