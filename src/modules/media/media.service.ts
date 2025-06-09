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
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { EntertainerMedia } from './entities/entertainer-media.entity';
import { deleteFileFromServer } from 'src/common/middlewares/multer.middleware';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(EntertainerMedia)
    private readonly entertainerMediaRepository: Repository<EntertainerMedia>,
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
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
  // New  Entertainer Media Upload

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

  async findById(id: number) {
    const media = await this.mediaRepository
      .createQueryBuilder('media')
      .select([
        'media.id AS id',
        `CONCAT('${this.config.get<string>('BASE_URL')}', media.url) AS url`,
        'media.type AS type',
        'media.name  AS name',
      ])
      .where('media.user_id = :id', { id })
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
      deleteFileFromServer(media.url);
      return { message: 'media deleted successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  // Entertainer Service Method

  async handleEntertainerMediaUpload(
    userId: number,
    uploadedFiles: UploadedFile[],
    dto?: UploadMedia,
  ) {
    const { eventId = null } = dto;
    try {
      for (const file of uploadedFiles) {
        if (!file || !file.type) continue; // Safety check

        if (file.type === 'headshot') {
          const existsAlready = await this.entertainerMediaRepository.findOne({
            where: { user_id: userId, type: 'headshot' },
          });

          if (existsAlready) {
            await this.entertainerMediaRepository.update(
              { id: existsAlready.id },
              { url: file.url, name: file.name },
            );
          } else {
            // Create a new headshot if none exists
            const newHeadshot = this.entertainerMediaRepository.create({
              ...file,
              user_id: userId,
              eventId,
            });
            await this.entertainerMediaRepository.save(newHeadshot);
          }
          continue;
        }

        // For non-headshot files, create a new media entry
        const media = this.entertainerMediaRepository.create({
          ...file,
          user_id: userId,
          eventId,
        });

        await this.entertainerMediaRepository.save(media);
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
  async removeEntertainerMedia(id: number) {
    const media = await this.entertainerMediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException({
        message: 'media not found',
        status: false,
      });
    }

    try {
      await this.entertainerMediaRepository.remove(media);
      // Also remove the media from server storage
      deleteFileFromServer(media.url);

      return { message: 'media deleted successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        status: false,
      });
    }
  }
  async findAllEntertainerMedia(userId: number) {
    const link = await this.entertainerRepository.findOne({
      where: { id: userId },
      select: ['mediaLink'],
    });
    const media = await this.entertainerMediaRepository
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
    return {
      message: 'Multimedia returned successfully',
      media,
      mediaLink: link,
      status: true,
    };
  }
  async findEntertainerMediaById(id: number) {
    const link = await this.entertainerRepository.findOne({
      where: { id },
      select: ['mediaLink'],
    });

    const media = await this.entertainerMediaRepository
      .createQueryBuilder('media')
      .select([
        'media.id AS id',
        `CONCAT('${this.config.get<string>('BASE_URL')}', media.url) AS url`,
        'media.type AS type',
        'media.name  AS name',
      ])
      .where('media.user_id = :id', { id })
      .getRawMany();

    if (!media) {
      throw new BadRequestException({
        message: 'Media Not Found',
        status: false,
      });
    }
    return {
      message: 'Multimedia returned successfully',
      media,
      mediaLink: link,
      status: true,
    };
  }
}
