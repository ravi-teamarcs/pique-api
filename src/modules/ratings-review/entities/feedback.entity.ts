import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('feedback')
export class FeedbackAnswer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'event_id', type: 'bigint' })
  eventId: number;

  @Column({ name: 'reviewer_id', type: 'bigint' })
  reviewerId: number;

  @Column({
    name: 'reviewer_type',
    type: 'enum',
    enum: ['venue', 'entertainer'],
  })
  reviewerType: 'venue' | 'entertainer';

  @Column({ name: 'reviewee_id', type: 'bigint' })
  revieweeId: number;

  @Column({
    name: 'reviewee_type',
    type: 'enum',
    enum: ['venue', 'entertainer'],
  })
  revieweeType: 'venue' | 'entertainer';

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  review: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
