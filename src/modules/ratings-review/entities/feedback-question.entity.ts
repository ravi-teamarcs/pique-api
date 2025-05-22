import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('feedback_question')
export class FeedbackQuestion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  question: string;

  @Column({
    name: 'for_role',
    type: 'enum',
    enum: ['venue', 'entertainer', 'both'],
  })
  forRole: 'venue' | 'entertainer' | 'both';

  @Column({ type: 'enum', enum: ['mcq', 'text'], default: 'mcq' })
  type: 'mcq' | 'text' | 'rating';

  @Column({ default: true })
  isActive: boolean;
}
