import { Booking } from 'src/modules/booking/entities/booking.entity';
import { User } from '../../users/entities/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  contactInfo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.venues)
  user: User;
 
  @OneToMany(() => Booking, (booking) => booking.venue)
  bookings: Booking[];

  // @OneToMany(() => VenueEntertainersBooking, (booking) => booking.venue)
  // bookings: VenueEntertainersBooking[];
}
