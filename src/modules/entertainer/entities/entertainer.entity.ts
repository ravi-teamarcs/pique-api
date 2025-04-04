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

  @Column()
  name: string;

  @Column()
  category: number;

  @Column()
  specific_category: number;

  @Column()
  bio: string;

  @Column({
    type: 'enum',
    enum: ['soloist', 'duo', 'trio', 'ensemble'],
    nullable: false,
  })
  performanceRole: 'soloist' | 'duo' | 'trio' | 'ensemble';

  @Column()
  phone1: string;

  @Column()
  phone2: string;

  @Column()
  pricePerEvent: number;

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  vaccinated: 'yes' | 'no';

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  availability: 'yes' | 'no';

  @OneToOne(() => User, (user) => user.entertainer, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
  @OneToMany(() => Tour, (tour) => tour.entertainer)
  tours: Tour[];

  @OneToMany(() => Gig, (gig) => gig.entertainer)
  gigs: Gig[];

  @Column()
  status: string;
  @Column()
  city: number;

  @Column()
  state: number;

  @Column()
  country: number;

  @Column()
  socialLinks: string;

  // New changes Introduced  (Latest Changes Both )  Can be Changed

  // @Column()
  // dob: Date;

  // @Column()
  // Address: string;

  // @Column()
  // zipCode: string;

  // @Column('simple-array)
  // services: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
