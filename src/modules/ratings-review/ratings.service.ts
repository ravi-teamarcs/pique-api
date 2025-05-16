import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { FeedbackQuestion } from './entities/feedback-question.entity';
import { DataSource, In, Repository } from 'typeorm';
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
    @InjectRepository(FeedbackAnswerDetail)
    private readonly detailsRepo: Repository<FeedbackAnswerDetail>,
    private readonly dataSource: DataSource,
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Save Feedback
      const feedback = this.feedbackRepo.create(rest);
      const savedFeedback = await queryRunner.manager.save(feedback);

      // Step 2: Save Answers
      const answerData = answers.map((ans) =>
        this.detailsRepo.create({
          feedbackId: savedFeedback.id,
          ...ans,
        }),
      );

      await queryRunner.manager.save(answerData);

      // Commit transaction
      await queryRunner.commitTransaction();

      return {
        message: 'Feedback submitted successfully',
        status: true,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(error.message);
    } finally {
      await queryRunner.release();
    }
  }
}
