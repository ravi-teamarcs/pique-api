// entities/entertainer-availability.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

type Slot = 'morning' | 'afternoon' | 'evening' | 'night' | 'whole_day';
interface UnavailableDate {
  date: string; // "YYYY-MM-DD"
  slots: Slot[];
}
@Entity('entertainer_availability')
export class EntertainerAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entertainer_id: number;

  @Column({ type: 'json' })
  available_dates: string[];

  @Column({ type: 'json' })
  unavailable_dates: { date: string; slots: string[] }[];

  @Column({ type: 'json' })
  unavailable_weekdays: number[];

  @Column()
  year: number;

  @Column()
  month: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
