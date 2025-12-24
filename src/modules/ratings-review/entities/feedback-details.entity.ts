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

  @Column({ name: 'feedback_id' })
  feedbackId: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @Column({ name: 'option_id', nullable: true })
  optionId: number;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText: string;
}
