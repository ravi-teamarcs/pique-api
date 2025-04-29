import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { Repository } from 'typeorm';
import { UploadedFile } from 'src/common/types/media.type';
import { UploadMedia } from './dto/upload-media.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly config: ConfigService,
  ) {}

  async handleMediaUpload(
    userId: number,
    uploadedFiles: UploadedFile[],
    dto?: UploadMedia,
  ) {
    const { eventId = null } = dto;
    try {
      for (const file of uploadedFiles) {
        if (!file || !file.type) continue; // Safety check

        if (file.type === 'headshot') {
          const existsAlready = await this.mediaRepository.findOne({
            where: { user_id: userId, type: 'headshot' },
          });

          if (existsAlready) {
            await this.mediaRepository.update(
              { id: existsAlready.id },
              { url: file.url, name: file.name },
            );
          } else {
            // Create a new headshot if none exists
            const newHeadshot = this.mediaRepository.create({
              ...file,
              user_id: userId,
              eventId,
            });
            await this.mediaRepository.save(newHeadshot);
          }
          continue;
        }

        // For non-headshot files, create a new media entry
        const media = this.mediaRepository.create({
          ...file,
          user_id: userId,
          eventId,
        });

        await this.mediaRepository.save(media);
      }

      return {
        message: 'Files Saved Successfully',
        data: uploadedFiles,
        status: true,
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new InternalServerErrorException({
        message: 'Failed to upload media',
        status: false,
      });
    }
  }

  async findAllMedia(userId: number) {
    const media = await this.mediaRepository
      .createQueryBuilder('media')
      .select([
        'media.id AS id',
        `CONCAT('${this.config.get<string>('BASE_URL')}', media.url) AS url`,
        'media.type AS type',
        'media.name  AS name',
      ])
      .where('media.user_id = :userId', { userId })
      .getRawMany();

    if (!media) {
      throw new BadRequestException({
        message: 'Media Not Found',
        status: false,
      });
    }
    return { message: 'Multimedia returned successfully', media, status: true };
  }

  async updateMedia(mediaId: number, uploadedFile) {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException(
        'Media not found or not associated with the provided venue.',
      );
    }

    // Update media
    await this.mediaRepository.update({ id: media.id }, uploadedFile);

    return { message: 'Media updated Successfully', status: true };
  }

  async removeMedia(id: number) {
    const media = await this.mediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException({
        message: 'media not found',
        status: false,
      });
    }

    try {
      await this.mediaRepository.remove(media);
      return { message: 'media deleted successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
}
