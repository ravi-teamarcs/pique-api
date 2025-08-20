import { Event } from 'src/modules/admin/events/entities/event.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Series {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'series_name' })
  seriesName: string;

  @Column({ name: 'venue_id', nullable: true })
  venueId: number;

  @OneToMany(() => Event, (event) => event.series)
  events: Event[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
