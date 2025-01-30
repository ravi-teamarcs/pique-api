import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import multer, { Multer } from 'multer';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Upload User Multimedia' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully.' })
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

    const userId = req.user.userId;
    const venueId =
      body.venueId === undefined ? body.venueId : Number(body.venueId);

    if (files.images) {
      for (const file of files.images) {
        const filePath = await uploadFile(file); // Call the upload function
        const fileObj = {
          url: filePath,
          name: file.originalname,
          type: 'image',
        };
        uploadedFiles.push(fileObj); // Push the constructed object to the array
      }
    }

    // // Handle videos
    if (files.videos) {
      for (const file of files.videos) {
        const filePath = await uploadFile(file); // Call the upload function
        const fileObj = {
          url: filePath,
          name: file.originalname,
          type: 'video',
        };
        uploadedFiles.push(fileObj); // Push the constructed object to the array
      }
    }
    if (files.headshot) {
      for (const file of files.headshot) {
        const filePath = await uploadFile(file); // Call the upload function
        const fileObj = {
          url: filePath,
          name: file.originalname,
          type: 'headshot',
        };
        uploadedFiles.push(fileObj); // Push the constructed object to the array
      }
    }

    return this.mediaService.handleMediaUpload(userId, uploadedFiles, venueId);
  }

  @Get('uploads')
  @ApiOperation({
    summary: 'Get all the multimedia of the logged in User.',
  })
  @ApiResponse({ status: 200, description: 'Multimedia fetched Successfully.' })
  getAllMedia(@Req() req: any, @Query('venueId') venueId?: number) {
    const userId = req.user.userId; // Replace with actual user id
    return this.mediaService.findAllMedia(userId, venueId);
  }
}
