import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FeedbackQuestion } from './feedback-question.entity';

@Entity('feedback_option')
export class FeedbackOption {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  value: string;

  @Column({ type: 'int', default: 1 })
  sortOrder: number;

  @Column({ name: 'question_id' })
  question_id: number;
}
