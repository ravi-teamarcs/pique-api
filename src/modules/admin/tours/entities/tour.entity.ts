import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gig } from './gig.entity';

@Entity('tours')
export class Tour {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // "Valentine's Day Tour"

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: false })
  isVisibleToVenues: boolean; // Can be toggled by entertainer

  @ManyToOne(() => Entertainer, (entertainer) => entertainer.tours)
  entertainer: Entertainer;

  @OneToMany(() => Gig, (gig) => gig.tour, { nullable: true })
  gigs: Gig[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
