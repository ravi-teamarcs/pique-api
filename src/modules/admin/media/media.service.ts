import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadedFile } from 'src/common/types/media.type';
import { Media } from './Entity/media.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadUrlDto } from './Dto/UploadUrlDto.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) { }

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




  async findAllMedia(Id: number) {
    if (!Id) {
      throw new BadRequestException('Id is required.');
    }

    const media = await this.mediaRepository
      .createQueryBuilder('media')
      .select([
        'media.id AS id',
        `CONCAT('${process.env.SERVER_URI}', media.url) AS url`,
        'media.type AS type',
        'media.refId AS venueId',
        'media.userId AS userId',
        'media.name AS name',
      ])
      .where('media.refId = :Id', { Id })
      .orWhere('media.userId = :Id', { Id })

      .getRawMany();

    if (media.length === 0) {
      throw new BadRequestException('Media Not Found');
    }

    return { message: 'Multimedia returned successfully', media };
  }



  async updateMedia(
    mediaId: number,
    userId: any,
    RefId: any,
    uploadedFile: any
  ) {
    // Initialize where clause to dynamically build the query
    const whereClause: any = {};

    // Add conditions for mediaId and userId if provided
    if (mediaId) {
      whereClause.id = mediaId; // Use mediaId as a primary condition
    }

    if (userId) {
      whereClause.user = { id: userId }; // Add user condition if provided
    }
    if (RefId) {
      whereClause.refId = { id: RefId };
    }

    // Check if media exists based on provided conditions
    let media = await this.mediaRepository.findOne({
      where: whereClause,
    });

    if (media) {
      // If media exists, update it with the uploaded file
      await this.mediaRepository.update(media.id, {
        ...uploadedFile, // Update with new file details
      });
      return { message: "Media updated successfully.", status: true };
    } else {
      return { message: "Media Not Found.", status: false };
    }
  }


  async deleteMedia(Id: number) {
    if (!Id) {
      throw new BadRequestException('Id is required.');
    }

    // Find media based on the provided Id (use findOne for a single result)
    const media = await this.mediaRepository.findOne({
      where: { id: Id }, // Use 'id' in lowercase for correct database column reference
    });

    if (!media) {
      throw new BadRequestException('Media not found.');
    }

    // Delete the found media
    await this.mediaRepository.delete({ id: media.id });

    return { message: 'Media deleted successfully' };
  }



  async uploadUrl(uploadUrlDto: UploadUrlDto): Promise<Media> {
    const { url, userId, refId, type } = uploadUrlDto;

    if (!userId && !refId) {
      throw new BadRequestException('Either userId or refId must be provided.');
    }

    // Extract filename from URL
    const name = url.split('/').pop() || 'Unknown File';

    // Default type to 'video' if not provided
    const mediaType = type || 'video';

    const media = this.mediaRepository.create({
      url,
      name,
      type: mediaType,
      user: userId ? { id: userId } as any : null, // Associate user
      refId,
    });

    return await this.mediaRepository.save(media);
  }




}
