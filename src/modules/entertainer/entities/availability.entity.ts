// entities/entertainer-availability.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('entertainer_availability')
export class EntertainerAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entertainer_id: number;

  @Column({ type: 'json' })
  unavailable_dates: string[];

  @Column({ type: 'json' })
  available_dates: string[];

  @Column({ type: 'json' })
  unavailable_weekdays: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
