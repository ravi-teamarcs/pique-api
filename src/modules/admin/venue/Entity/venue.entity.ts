// import { Booking } from '../../booking/entities/booking.entity';
// import { VenueEvent } from '../../event/entities/event.entity';
import { User } from '../../users/Entity/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
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

  @Column()
  lat: string;

  @Column()
  long: string;

  @Column('simple-array')
  amenities: string[];

  @Column()
  websiteUrl: string;

  // @Column()
  // timings: string;

  @Column()
  bookingPolicies: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @Column({ default: false })
  isParent: boolean;

  @Column({ nullable: true })
  parentId: number;

  @ManyToOne(() => User, (user) => user.venue, { onDelete: 'CASCADE' })
  user: User;



}


