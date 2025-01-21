import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Entity('entertainers')
export class Entertainer {
  // @PrimaryGeneratedColumn()
  // id: number;

  // @Column()
  // name: string;

  // @Column()
  // expertise: string;

  // @Column()
  // availability: string;

  // @ManyToOne(() => User, (user) => user.entertainers, { onDelete: 'CASCADE' })
  // user: User;

  // @CreateDateColumn()
  // createdAt: Date;

  // @UpdateDateColumn()
  // updatedAt: Date;

  @PrimaryGeneratedColumn({type:'bigint'})
  id: number;

  @OneToMany(() => Booking, (booking) => booking.entertainer)
  bookings: Booking[];
  // @ManyToMany(() => Booking, (booking) => booking.entertainers)
  // bookings: Booking[];

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  bio: string;

  @Column()
  headshotUrl: string;

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

  @Column()
  mediaUrl: string;

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  vaccinated: 'yes' | 'no';

  @Column({ type: 'enum', enum: ['yes', 'no'], nullable: true })
  availability: 'yes' | 'no';

  @ManyToOne(() => User, (user) => user.entertainers, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  status: string;

  @Column()
  socialLinks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
