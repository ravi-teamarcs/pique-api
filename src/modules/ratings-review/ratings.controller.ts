import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('questions')
  async getQuestions(@Query('role') role: 'venue' | 'entertainer') {
    if (!role || (role !== 'venue' && role !== 'entertainer')) {
      throw new Error('Invalid role. Must be venue or entertainer.');
    }

    return this.ratingsService.getQuestionsByRole(role);
  }

  @Post()
  async submitFeedback(@Body() dto: CreateFeedbackDto) {
    return this.ratingsService.saveFeedback(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getRatingsById(@Request() req) {
    const { refId } = req.user;
    return this.ratingsService.calculateAverageRating(refId);
  }
}
