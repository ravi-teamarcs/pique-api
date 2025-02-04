import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('event')
export class VenueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // Use 'date' type for storing date in YYYY-MM-DD format
  @Column({ type: 'date' })
  date: string;

  // Use 'time' type for storing time in HH:MM:SS format
  @Column({ type: 'time' })
  time: string;

  @Column()
  location: string;

  @Column()
  userId: number;

  @Column()
  venueId: number;

  @Column()
  description: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
