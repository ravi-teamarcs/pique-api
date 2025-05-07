import { Transform } from 'class-transformer';
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
import { Gig } from '../../tours/entities/gig.entity';

@Entity('venue')
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  addressLine1: string;

  // Now made  AddressLine 2  unavailable
  @Column({ nullable: true })
  addressLine2: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  city: number;

  @Column({ nullable: true })
  state: number;

  @Column({ nullable: true })
  zipCode: string;

  @Column({ nullable: true })
  country: number;
  @Column({ default: 'pending' })
  status: 'active' | 'inactive' | 'pending' | 'rejected';

  @Column({ name: 'contact_person' })
  contactPerson: string;

  @Column({ name: 'contact_number' })
  contactNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.venue, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => Gig, (gigs) => gigs.venue)
  gigs: Gig[];

  @Column({ type: 'boolean', default: false })
  @Transform(({ value }) => Boolean(value))
  isParent: boolean;

  @Column({ nullable: true })
  parentId: number;

  @Column({ default: 0 }) // Step 0 = Not Started
  profileStep: number; //

  @Column({ default: false })
  isProfileComplete: boolean;
}

//Note in second callback first Argument Doesn't Matter it the second one that must be property name.
