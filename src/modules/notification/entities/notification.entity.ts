import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
// import { Entertainer } from './Entertainer';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message: string;

  @Column()
  venueId: number;

  @Column()
  entertainerId: number;

  @CreateDateColumn()
  createdAt: Date;
}
