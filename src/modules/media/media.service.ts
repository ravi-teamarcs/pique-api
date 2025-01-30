import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async handleMediaUpload(
    userId: number,
    uploadedFiles: Array<{}>,
    venueId: number,
  ) {
    console.log('In Server ', userId, uploadedFiles ,venueId);
    try {
      for (const file of uploadedFiles) {
        const media = this.mediaRepository.create({
          ...file,
          user: { id: userId },
          refId: venueId ?? null,
        });
        await this.mediaRepository.save(media);
      }
      return { message: 'Files Saved Successfully' };
    } catch (error) {
      console.log(error);
      throw new Error(`Error while Saving the Files`);
    }
  }

  async findAllMedia(userId: number, venueId: number) {
    if (venueId) {
      const media = await this.mediaRepository.find({
        where: {
          refId: venueId, // Exact match for refId
          user: { id: userId }, // Exact match for userId
        },
        select: ['url', 'type', 'refId', 'name'],
      });

      return { message: 'Multimedia returned successfully', media };
    }

    const media = await this.mediaRepository.find({
      where: { user: { id: userId } },
      select: ['url', 'type', 'name'],
    });

    if (!media) {
      throw new BadRequestException('Media Not Found');
    }

    return { message: 'Multimedia returned successfully', media };
  }
}
