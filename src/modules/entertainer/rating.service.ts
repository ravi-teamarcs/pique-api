import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { RatingDto } from './dto/rating.dto';
@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
  ) {}

  async addRating(userId: number, rateDto: RatingDto) {
    const { eid, review, rating } = rateDto;
    try {
      const previouslyRated = await this.ratingRepo.findOne({
        where: { uid: userId, eid },
      });
      if (previouslyRated) {
        await this.ratingRepo.update(
          { id: previouslyRated.id },
          { review, rating },
        );
      }
      const rate = this.ratingRepo.create(rateDto);
      await this.ratingRepo.save(rate);

      return {
        message: 'Entertainer has been Successfully Rated',
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async getAverageRating(eid: number) {
    try {
      const ratings = await this.ratingRepo.find({ where: { eid } });

      if (!ratings.length) return 0;

      const total = ratings.reduce((sum, r) => sum + r.rating, 0);
      const result = total / ratings.length;
      return {
        message: 'Average Rating returned Successfully',
        status: true,
        data: result,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async getRating(eid: number , ) {
    try {
      const ratings = await this.ratingRepo.find({ where: { eid } });
      return {
        message: 'Ratings returned Successfully',
        status: true,
        data: ratings,
      };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }
}
