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

  async handleMediaUpload(userId: number, uploadedFiles: Array<{}>) {
    try {
      for (const file of uploadedFiles) {
        const media = this.mediaRepository.create({
          ...file,
          user: { id: userId },
          // TODO: Add file details here.
        });
        await this.mediaRepository.save(media);
      }
    } catch (error) {
      throw new Error(`Erro while Saving the Files`);
    }
  }

  async findAllMedia(userId: number) {
    const media = await this.mediaRepository.find({
      where: { user: { id: userId } },
    });

    if (!media) {
      throw new BadRequestException('Media Not Found');
    }

    return { message: 'Multimedia returned successfully', media };
  }
}
