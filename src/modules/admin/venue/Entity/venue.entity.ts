// import { Booking } from '../../booking/entities/booking.entity';
// import { VenueEvent } from '../../event/entities/event.entity';
import { Transform } from 'class-transformer';
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

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
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
}
