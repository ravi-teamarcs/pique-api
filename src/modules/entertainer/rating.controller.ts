import { Controller, Post, Param, Body, Get, Request } from '@nestjs/common';
import { RatingsService } from './rating.service';
import { RatingDto } from './dto/rating.dto';
import { Roles } from '../auth/roles.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}
  @ApiOperation({
    summary: 'Used to add Ratings and reviews to an entertainer',
  })
  @ApiResponse({
    status: 201,
    description: 'Entertainer has  been successfully Rated.',
  })
  @Roles('findAll')
  @Post()
  async addRating(@Body() ratingDto: RatingDto, @Request() req) {
    const { userId } = req.user;
    return this.ratingsService.addRating(userId, ratingDto);
  }
  @ApiOperation({
    summary: 'Get Average Rating of an entertainer by Id',
  })
  @ApiResponse({
    status: 200,
    description: 'Entertainer rating fetched Successfully.',
  })
  @Get(':entertainerId/average')
  async getAverageRating(@Param('entertainerId') entertainerId: number) {
    return this.ratingsService.getAverageRating(entertainerId);
  }
}
