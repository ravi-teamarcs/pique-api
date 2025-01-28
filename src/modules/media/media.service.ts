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
    console.log('In Server ', userId, uploadedFiles);
    try {
      for (const file of uploadedFiles) {
        const media = this.mediaRepository.create({
          ...file,
          user: { id: userId },
          // TODO: Add file details here.
        });
        await this.mediaRepository.save(media);
      }
      return { message: 'Files Saved Successfully' };
    } catch (error) {
      console.log(error);
      throw new Error(`Error while Saving the Files`);
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
