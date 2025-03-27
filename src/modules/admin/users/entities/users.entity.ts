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
import { VenueEvent } from 'src/modules/event/entities/event.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';

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

  // @Column()
  // completed: boolean;
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

  // Booking
  @OneToMany(() => Booking, (booking) => booking.venueUser, { cascade: true })
  venueBookings: Booking[];

  @OneToMany(() => Booking, (booking) => booking.entertainerUser, {
    cascade: true,
  })
  entertainerBookings: Booking[];
  // Relation with Media

  // Media
  @OneToMany(() => Media, (media) => media.user, { cascade: true })
  media: Media[];

  @Column()
  isVerified: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;
}
