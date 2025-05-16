import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('feedback_answer_detail')
export class FeedbackAnswerDetail {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  feedback_id: number;

  @Column()
  question_id: number;

  @Column({ nullable: true })
  option_id: number;

  @Column({ type: 'text', nullable: true })
  answer_text: string;
}
