import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tour } from './tour.entity';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import { Venue } from '../../venue/entities/venue.entity';

@Entity('gigs')
export class Gig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Example: "Valentine's Day Performance"

  @Column()
  date: Date;

  @ManyToOne(() => Venue, (venue) => venue.gigs)
  venue: Venue;

  @ManyToOne(() => Entertainer, (entertainer) => entertainer.gigs)
  entertainer: Entertainer;

  @ManyToOne(() => Tour, (tour) => tour.gigs, { nullable: true })
  tour: Tour; // Optional, since not all gigs belong to a tour

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
