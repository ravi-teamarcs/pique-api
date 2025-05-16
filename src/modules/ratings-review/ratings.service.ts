import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { FeedbackQuestion } from './entities/feedback-question.entity';
import { In, Repository } from 'typeorm';
import { FeedbackAnswer } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { FeedbackOption } from './entities/feedback-answer.entity';
import { FeedbackAnswerDetail } from './entities/feedback-details.entity';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(FeedbackQuestion)
    private readonly questionRepo: Repository<FeedbackQuestion>,
    @InjectRepository(FeedbackAnswer)
    private readonly feedbackRepo: Repository<FeedbackAnswer>,
    @InjectRepository(FeedbackOption)
    private readonly optionRepo: Repository<FeedbackOption>,
    @InjectRepository(FeedbackOption)
    private readonly detailsRepo: Repository<FeedbackAnswerDetail>,
  ) {}

  async getQuestionsByRole(role: 'venue' | 'entertainer') {
    const questions = await this.questionRepo.find({
      where: [
        { forRole: role, isActive: true },
        { forRole: 'both', isActive: true },
      ],
      order: { id: 'ASC' },
    });

    const questionIds = questions.map((q) => q.id);
    const options = await this.optionRepo.findBy({
      question_id: In(questionIds),
    });

    const optionsMap = options.reduce(
      (acc, opt) => {
        acc[opt.question_id] = acc[opt.question_id] || [];
        acc[opt.question_id].push(opt);
        return acc;
      },
      {} as Record<number, FeedbackOption[]>,
    );

    const finalResult = questions.map((q) => ({
      ...q,
      options: optionsMap[q.id] || [],
    }));
    return {
      message: 'Feedback question fetched Successfully ',
      status: true,
      data: finalResult,
    };
  }

  async saveFeedback(dto: CreateFeedbackDto) {
    const { answers, ...rest } = dto;
    const payload = { ...rest };
    const feedback = this.feedbackRepo.create(payload);

    const savedFeedback = await this.feedbackRepo.save(feedback);

    //   Save  Answer details here
    const answerData = answers.map((ans) =>
      this.detailsRepo.create({
        feedback_id: savedFeedback.id,
        question_id: ans.question_id,
        option_id: ans.option_id,
        answer_text: ans.answer_text,
      }),
    );

    await this.feedbackRepo.save(answerData);

    return {
      message: 'Feedback submitted successfully',
      status: true,
    };
  }
}
