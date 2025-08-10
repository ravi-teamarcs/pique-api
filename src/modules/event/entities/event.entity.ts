import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ default: false })
  isCloseToggleActive: boolean; // true = toggle enabled, false = disabled

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
