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

  @Column()
  location: string;

  @Column()
  userId: number;

  @Column()
  venueId: number;

  @Column()
  description: string;


  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  })
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';

  @Column({
    type: 'enum',
    enum: ['pending', 'scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  })
  status: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @Column({ type: 'boolean', default: true })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}