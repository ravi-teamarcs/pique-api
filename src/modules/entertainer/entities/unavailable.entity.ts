import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('unavailability')
export class UnavailableDate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user: number;

  @Column('date')
  date: string;
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
