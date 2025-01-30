import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { Repository } from 'typeorm';
import { UploadedFile } from 'src/common/types/media.type';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async handleMediaUpload(
    userId: number,
    uploadedFiles: UploadedFile[],
    venueId: number,
  ) {
    try {
      for (const file of uploadedFiles) {
        if (!file || !file.type) continue; // Safety check

        if (file.type === 'headshot') {
          const existsAlready = await this.mediaRepository.findOne({
            where: { user: { id: userId }, type: 'headshot' },
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
              user: { id: userId },
              refId: venueId ?? null,
            });
            await this.mediaRepository.save(newHeadshot);
          }
          continue;
        }

        // For non-headshot files, create a new media entry
        const media = this.mediaRepository.create({
          ...file,
          user: { id: userId },
          refId: venueId ?? null,
        });
        await this.mediaRepository.save(media);
      }

      return { message: 'Files Saved Successfully' };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new Error('Media upload failed');
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
