import { Venue } from '../../venue/entities/venue.entity';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { VenueEvent } from '../../event/entities/event.entity';
import { Media } from '../../media/entities/media.entity';
// import { Invoice } from '../../invoice/entities/invoice.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 13 })
  phoneNumber: string;

  @Column({ type: 'enum', enum: ['venue', 'entertainer'] })
  role: 'venue' | 'entertainer';

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'pending'],
    default: 'pending',
  })
  status: 'active' | 'inactive' | 'pending';

  // @OneToMany(() => Venue, (venue) => venue.user)
  // venues: Venue[];
  // @OneToMany(() => Invoice, (invoice) => invoice.customer)
  // invoice: Invoice[];

  @OneToOne(() => Entertainer, (entertainer) => entertainer.user, {
    cascade: true,
  })
  entertainer: Entertainer;

  @OneToMany(() => Venue, (venue) => venue.user, { cascade: true })
  venue: Venue[];

  // Events linked with venueUser
  @OneToOne(() => VenueEvent, (event) => event.user, { cascade: true })
  events: VenueEvent;

  // Booking
  @OneToMany(() => Booking, (booking) => booking.venueUser)
  venueBookings: Booking[];

  @OneToMany(() => Booking, (booking) => booking.entertainerUser)
  entertainerBookings: Booking[];
  // Relation with Media

  // Media
  @OneToMany(() => Media, (media) => media.user, { cascade: true })
  media: Media[];

  // Invoice
  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices: Invoice[];

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;
}

// @OneToMany(() => Entertainer, (entertainer) => entertainer.user)
// entertainers: Entertainer[];

// Need to add a Relation that a user can have multiple Booking
