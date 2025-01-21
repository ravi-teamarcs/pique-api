import { Entertainer } from 'src/modules/entertainer/entities/entertainer.entity';
import { User } from 'src/modules/users/entities/users.entity';
import { Venue } from 'src/modules/venue/entities/venue.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;
  // { type: 'bigint' }

  // @ManyToOne(() => User, (user) => user.bookings)
  // user: User; // The user who made the booking

  @ManyToOne(() => Venue, (venue) => venue.bookings)
  venue: Venue;

  // @ManyToMany(() => Entertainer, (entertainer) => entertainer.bookings)
  // @JoinTable() // Required for ManyToMany
  // entertainers: Entertainer[];

  @ManyToOne(() => Entertainer, (entertainer) => entertainer.bookings)
  entertainer: Entertainer;

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

  @Column()
  showTime: string;

  @Column()
  showDate: string;

  @Column({
    type: 'enum',
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending',
  })
  isAccepted: 'accepted' | 'rejected' | 'pending';

  @Column()
  specialNotes: string;

  @Column()
  specificLocation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
