import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class WeeklyAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user: number;

  @Column()
  dayOfWeek: string; // 'monday', 'tuesday', etc.

  @Column('time')
  startTime: string;

  @Column('time')
  endTime: string;
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
