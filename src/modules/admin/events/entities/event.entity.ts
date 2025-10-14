import { Venue } from 'src/modules/venue/entities/venue.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Series } from '../../series/entities/series.entity';

@Entity('event')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  location: string;

  //added new Changes
  @Column({ type: 'timestamp' })
  eventStartDateTime: Date;

  @Column({ type: 'timestamp' })
  eventEndDateTime: Date;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id' })
  subCategoryId: number;

  @Column()
  venueId: number;

  @Column({ nullable: true })
  sub_venue_id: number;

  @Column({ type: 'text' })
  slug: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  })
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';

  @Column({
    type: 'enum',
    enum: [
      'unpublished',
      'published',
      'invited',
      'confirmed',
      'canceled',
      'completed',
      'rescheduled',
    ],
    default: 'unpublished',
  })
  status:
    | 'unpublished'
    | 'rescheduled'
    | 'confirmed'
    | 'canceled'
    | 'completed'
    | 'published'
    | 'invited';

  @Column({ type: 'boolean', default: true })
  isAdmin: boolean;

  // events.entity.ts

  @ManyToOne(() => Series, (series) => series.events, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'series_id' }) // Explicitly name the FK column
  series: Series;

  @Column({ default: false })
  emailSentAfter1Hour: boolean;

  @Column({ default: false })
  emailSentAfter24Hour: boolean;

  @Column({ default: false })
  isCloseToggleActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
