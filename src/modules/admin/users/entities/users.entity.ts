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

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 13, nullable: true })
  phoneNumber: string;

  @Column({ type: 'enum', enum: ['venue', 'entertainer'] })
  role: 'venue' | 'entertainer';

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'pending',
  })
  status: 'active' | 'inactive' | 'pending' | 'rejected';

  @OneToOne(() => Entertainer, (entertainer) => entertainer.user, {
    cascade: true,
  })
  entertainer: Entertainer;

  @OneToMany(() => Venue, (venue) => venue.user, { cascade: true })
  venue: Venue[];

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  createdByAdmin: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;
}
