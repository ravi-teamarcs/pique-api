import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VenueEvent } from './event.entity';

@Entity('event_category_subcategory')
export class EventCategorySubcategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id' })
  subCategoryId: number;

  @ManyToOne(() => VenueEvent, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event: VenueEvent;
}
