import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('event')
export class VenueEvent {
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

  // @Column()
  // type: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
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
    default: 'scheduled',
  })
  status: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
