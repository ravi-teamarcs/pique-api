import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsService } from './ratings.service';
import { FeedbackQuestion } from './entities/feedback-question.entity';
import { FeedbackOption } from './entities/feedback-answer.entity';
import { FeedbackAnswer } from './entities/feedback.entity';
import { FeedbackAnswerDetail } from './entities/feedback-details.entity';
import { RatingsController } from './ratings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeedbackOption,
      FeedbackAnswer,
      FeedbackQuestion,
      FeedbackAnswerDetail,
    ]),
  ],
  exports: [],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
