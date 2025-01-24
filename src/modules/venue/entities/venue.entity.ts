// import { Booking } from '../../booking/entities/booking.entity';
// import { VenueEvent } from '../../event/entities/event.entity';
import { User } from '../../users/entities/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity('venue')
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  addressLine1: string;

  @Column()
  addressLine2: string;

  @Column()
  description: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  zipCode: string;

  @Column()
  country: string;

  @Column()
  lat: string;

  @Column()
  long: string;

  @Column()
  amenities: string;

  @Column()
  websiteUrl: string;

  @Column()
  timings: string;

  @Column()
  bookingPolicies: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.venue, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  // @OneToMany(() => Booking, (booking) => booking.venue)
  // bookings: Booking[];

  // @OneToMany(() => VenueEvent, (event) => event.venue)
  // events: VenueEvent[];
}

//Note in second callback first Argument Doesn't Matter it the second one that must be property name.
