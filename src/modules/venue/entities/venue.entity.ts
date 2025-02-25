// import { Booking } from '../../booking/entities/booking.entity';
// import { VenueEvent } from '../../event/entities/event.entity';
import { Transform } from 'class-transformer';
import { User } from '../../users/entities/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column({ type: 'text' })
  description: string;

  @Column()
  city: number;

  @Column()
  state: number;

  @Column()
  zipCode: string;

  @Column()
  country: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: false })
  lat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: false })
  long: number;

  @Column('simple-array')
  amenities: string[];

  @Column()
  websiteUrl: string;

  @Column()
  bookingPolicies: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.venue, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  @Transform(({ value }) => Boolean(value))
  isParent: boolean;

  @Column({ nullable: true })
  parentId: number;

  // @OneToMany(() => Booking, (booking) => booking.venue)
  // bookings: Booking[];

  // @OneToMany(() => VenueEvent, (event) => event.venue)
  // events: VenueEvent[];
}

//Note in second callback first Argument Doesn't Matter it the second one that must be property name.
