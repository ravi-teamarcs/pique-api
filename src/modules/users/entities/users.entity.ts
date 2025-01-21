import { Venue } from 'src/modules/venue/entities/venue.entity';
import { Entertainer } from 'src/modules/entertainer/entities/entertainer.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';

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
  
  // @Column({ type: 'enum', enum: ['active', 'inactive'] })
  // status: string;

  @OneToMany(() => Venue, (venue) => venue.user)
  venues: Venue[];

  @OneToMany(() => Entertainer, (entertainer) => entertainer.user)
  entertainers: Entertainer[];

  // @OneToMany(() => Booking, (booking) => booking.user)
  // bookings: Booking[];

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;
}

// @OneToMany(() => Entertainer, (entertainer) => entertainer.user)
// entertainers: Entertainer[];

// Need to add a Relation that a user can have multiple Booking
