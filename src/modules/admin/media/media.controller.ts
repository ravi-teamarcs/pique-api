import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { UploadUrlDto } from './Dto/UploadUrlDto.dto';

import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { typeMap } from 'src/common/constants/media.constants';

@ApiTags('admin')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('uploads')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 2 },
        { name: 'videos', maxCount: 4 },
        { name: 'headshot', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'videos' && file.size > 500 * 1024 * 1024) {
            return callback(
              new BadRequestException('Video file size cannot exceed 500 MB'),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  async uploadMedia(
    @Req() req: any,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      headshot?: Express.Multer.File[];
    },
    @Body() body,
  ) {
    const uploadedFiles = [];

    // Ensure at least one valid ID (userId or venueId) is provided
    if (!body.userId && !body.venueId) {
      throw new BadRequestException('Either userId or venueId is required.');
    }

    const userId = body.userId ? Number(body.userId) : undefined;
    const venueId = body.venueId ? Number(body.venueId) : undefined;

    // Ensure at least one media file is provided
    if (!files.images && !files.videos && !files.headshot) {
      throw new BadRequestException(
        'At least one media file (images, videos, or headshot) is required.',
      );
    }
    // New Code

    // Process Images
    if (files.images) {
      for (const file of files.images) {
        const filePath = await uploadFile(file);
        uploadedFiles.push({
          url: filePath,
          name: file.originalname,
          type: 'image',
        });
      }
    }

    // Process Videos
    if (files.videos) {
      for (const file of files.videos) {
        const filePath = await uploadFile(file);
        uploadedFiles.push({
          url: filePath,
          name: file.originalname,
          type: 'video',
        });
      }
    }

    // Process Headshot
    if (files.headshot) {
      for (const file of files.headshot) {
        const filePath = await uploadFile(file);
        uploadedFiles.push({
          url: filePath,
          name: file.originalname,
          type: 'headshot',
        });
      }
    }

    return this.mediaService.handleMediaUpload(userId, uploadedFiles, venueId);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('getmedia')
  getAllMedia(@Query('Id') Id?: number) {
    // Ensure at least one of the parameters is provided
    if (!Id) {
      throw new BadRequestException('Either userId or venueId is required.');
    }

    return this.mediaService.findAllMedia(Id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put('update/:mediaId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 1 },
        { name: 'videos', maxCount: 1 },
        { name: 'headshot', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'videos' && file.size > 500 * 1024 * 1024) {
            // 500 MB in bytes
            return callback(
              new BadRequestException('Video file size cannot exceed 500 MB'),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  async updateMedia(
    @Param('mediaId') mediaId: number,
    @Body() body: { userId?: number; RefId?: number },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      headshot?: Express.Multer.File[];
    },
  ) {
    const { userId } = body;

    // Validate only one type of media is uploaded
    const fileTypes = Object.keys(files).filter(
      (key) => files[key]?.length > 0,
    );
    if (fileTypes.length === 0) {
      throw new BadRequestException('No valid media uploaded');
    }
    if (fileTypes.length > 1) {
      throw new BadRequestException(
        'You must upload exactly one media type (image, video, or headshot).',
      );
    }

    const uploadResults = [];

    for (const fileType of fileTypes) {
      const file = files[fileType][0]; // The actual file object
      if (!file) continue;

      const { fieldname, originalname } = file;
      const filePath = await uploadFile(file); // Assuming you have an uploadFile function

      if (!filePath) {
        throw new Error('Failed to upload file');
      }

      const typeMap = {
        images: 'image',
        videos: 'video',
        headshot: 'headshot',
      };

      const uploadedFile = {
        url: filePath,
        name: originalname, // Access file's original name
        type: typeMap[fieldname], // Using fieldname to map the type
      };

      uploadResults.push(uploadedFile); // Add the uploaded file info to the results
    }

    return this.mediaService.updateMedia(
      Number(mediaId),
      userId,

      uploadResults[0],
    );
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete(':Id')
  async deleteMedia(@Query('Id') Id?: number) {
    // Ensure the Id parameter is provided
    if (!Id) {
      throw new BadRequestException('Id is required.');
    }

    return this.mediaService.deleteMedia(Id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('uploadurl')
  async uploadUrl(@Body() uploadUrlDto: UploadUrlDto): Promise<any> {
    return this.mediaService.uploadUrl(uploadUrlDto);
  }
}
