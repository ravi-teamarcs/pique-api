import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Tour } from '../../tours/entities/tour.entity';
import { Gig } from '../../tours/entities/gig.entity';

@Entity('entertainers')
export class Entertainer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'entertainer_name', nullable: true })
  entertainerName: string;

  @Column({ nullable: true })
  category: number;

  @Column({ nullable: true })
  specific_category: number;

  @Column({ nullable: true })
  bio: string;

  @Column({
    type: 'enum',
    enum: ['soloist', 'duo', 'trio', 'ensemble'],
    nullable: true,
  })
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @Column()
  phone1: string;

  @Column()
  phone2: string;

  @Column({ nullable: true })
  pricePerEvent: number;

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  vaccinated: 'yes' | 'no';

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  availability: 'yes' | 'no';

  @OneToOne(() => User, (user) => user.entertainer, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn()
  user: User;
  @OneToMany(() => Tour, (tour) => tour.entertainer)
  tours: Tour[];

  @OneToMany(() => Gig, (gig) => gig.entertainer)
  gigs: Gig[];

  @Column({ nullable: true })
  status: string;
  @Column({ nullable: true })
  city: number;

  @Column({ nullable: true })
  state: number;

  @Column({ nullable: true })
  country: number;

  @Column({ nullable: true })
  socialLinks: string;

  // New changes Introduced  (Latest Changes Both )  Can be Changed

  @Column({ type: 'date', nullable: true }) // Only stores YYYY-MM-DD, no time
  dob: Date;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column('simple-array', { nullable: true })
  services: string[];

  @Column({ nullable: true })
  contact_person: string;

  @Column({ nullable: true })
  contact_number: string;

  @Column({ default: 0 }) // Step 0 = Not Started
  profileStep: number; //

  @Column({ default: false })
  isProfileComplete: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
