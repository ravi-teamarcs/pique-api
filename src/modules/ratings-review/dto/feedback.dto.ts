import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDetailDto {
  @IsInt()
  questionId: number;

  @IsOptional()
  @IsInt()
  optionId?: number;

  @IsOptional()
  @IsString()
  answerText?: string;
}

export class CreateFeedbackDto {
  @IsInt()
  eventId: number;

  @IsInt()
  reviewerId: number;

  @IsEnum(['venue', 'entertainer'])
  reviewerType: 'venue' | 'entertainer';

  @IsInt()
  revieweeId: number;

  @IsEnum(['venue', 'entertainer'])
  revieweeType: 'venue' | 'entertainer';

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  review?: string;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => AnswerDetailDto)
  answers: AnswerDetailDto[];
}
