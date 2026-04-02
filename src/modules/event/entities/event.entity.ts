import { Series } from 'src/modules/series/entities/series.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EventCategorySubcategory } from './event-category-subcategory.entity';

@Entity('event')
export class VenueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text' })
  slug: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  venueId: number;

  @Column({ nullable: true })
  sub_venue_id: number;

  @Column()
  description: string;

  @Column({ type: 'timestamp' })
  eventStartDateTime: Date;

  @Column({ type: 'timestamp' })
  eventEndDateTime: Date;

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
      'invited',
      'published',
      'confirmed',
      'canceled',
      'completed',
      'rescheduled',
    ],
    default: 'unpublished',
  })
  status:
    | 'unpublished'
    | 'scheduled'
    | 'confirmed'
    | 'canceled'
    | 'completed'
    | 'published'
    | 'invited';

  @Column({ type: 'boolean' })
  isAdmin: boolean;

  @Column({ default: false })
  emailSentAfter1Hour: boolean;

  @Column({ default: false })
  emailSentAfter24Hour: boolean;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @Column({ name: 'subcategory_id', nullable: true })
  subCategoryId: number;

  @Column({ default: false })
  isCloseToggleActive: boolean; // true = toggle enabled, false = disabled

  @ManyToOne(() => Series, (series) => series.events, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'series_id' }) // Explicitly name the FK column
  series: Series;

  @OneToMany(() => EventCategorySubcategory, (ecs) => ecs.event, {
    cascade: true,
  })
  eventCategories: EventCategorySubcategory[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
