import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
// import { Booking } from '../../booking/entities/booking.entity';

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

  @OneToOne(() => User, (user) => user.entertainer)
  @JoinColumn()
  user: User;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
