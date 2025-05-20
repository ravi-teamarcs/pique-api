import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { FeedbackQuestion } from './entities/feedback-question.entity';
import { DataSource, In, Repository } from 'typeorm';
import { FeedbackAnswer } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { FeedbackOption } from './entities/feedback-answer.entity';
import { FeedbackAnswerDetail } from './entities/feedback-details.entity';
import { Entertainer } from '../entertainer/entities/entertainer.entity';

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

  // async calculateAverageRating(entertainerId: number) {
  //   const currentYear = new Date().getFullYear();
  //   const lastYear = currentYear - 1;

  //   const queryResult = await this.feedbackRepo
  //     .createQueryBuilder('feedback')
  //     .select('AVG(feedback.rating)', 'avg')
  //     .addSelect('COUNT(*)', 'total')
  //     .addSelect(
  //       `SUM(CASE WHEN feedback.rating = 1 THEN 1 ELSE 0 END)`,
  //       'count1',
  //     )
  //     .addSelect(
  //       `SUM(CASE WHEN feedback.rating = 2 THEN 1 ELSE 0 END)`,
  //       'count2',
  //     )
  //     .addSelect(
  //       `SUM(CASE WHEN feedback.rating = 3 THEN 1 ELSE 0 END)`,
  //       'count3',
  //     )
  //     .addSelect(
  //       `SUM(CASE WHEN feedback.rating = 4 THEN 1 ELSE 0 END)`,
  //       'count4',
  //     )
  //     .addSelect(
  //       `SUM(CASE WHEN feedback.rating = 5 THEN 1 ELSE 0 END)`,
  //       'count5',
  //     )
  //     .where('feedback.revieweeId = :entertainerId', { entertainerId })
  //     .getRawOne();

  //   // Get review count for this year
  //   const thisYearCount = await this.feedbackRepo
  //     .createQueryBuilder('feedback')
  //     .where('feedback.revieweeId = :entertainerId', { entertainerId })
  //     .andWhere('YEAR(feedback.created_at) = :year', { year: currentYear })
  //     .getCount();

  //   // Get review count for last year
  //   const lastYearCount = await this.feedbackRepo
  //     .createQueryBuilder('feedback')
  //     .where('feedback.revieweeId = :entertainerId', { entertainerId })
  //     .andWhere('YEAR(feedback.created_at) = :year', { year: lastYear })
  //     .getCount();

  //   const lastReview = await this.feedbackRepo
  //     .createQueryBuilder('feedback')
  //     .leftJoin('venue', 'venue', 'venue.id = reviewee_id')
  //     .select([
  //       'venue.name AS venueName , venue.contactPerson AS contactPerson , feedback.created_at AS createdAt',
  //       'feedback.rating AS rating',
  //       'feedback.review AS review',
  //     ])
  //     .where('feedback.revieweeId =:entertainerId ', { entertainerId })
  //     .limit(1)
  //     .orderBy('createdAt', 'DESC')
  //     .getRawOne();

  //   // Calculate growth
  //   let growth = 0;
  //   if (lastYearCount > 0) {
  //     growth = ((thisYearCount - lastYearCount) / lastYearCount) * 100;
  //   } else if (thisYearCount > 0) {
  //     growth = 100; // From 0 to some reviews
  //   }

  //   return {
  //     message: 'Rating summary fetched successfully',
  //     status: true,
  //     data: {
  //       averageRating: Math.min(parseFloat(queryResult.avg || '0'), 5),
  //       totalReviews: parseInt(queryResult.total),
  //       ratingCount: {
  //         1: parseInt(queryResult.count1),
  //         2: parseInt(queryResult.count2),
  //         3: parseInt(queryResult.count3),
  //         4: parseInt(queryResult.count4),
  //         5: parseInt(queryResult.count5),
  //       },
  //       yearlyReviewGrowthinPercent: growth, // in percent
  //       thisYearReviews: thisYearCount,
  //       lastYearReviews: lastYearCount,
  //       latestVenuefeedback: lastReview,
  //     },
  //   };
  // }
}
