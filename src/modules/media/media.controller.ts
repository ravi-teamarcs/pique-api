import {
  BadRequestException,
  Body,
  Controller,
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
import { MediaService } from './media.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MediaDto } from './dto/update-media.dto';

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

  @Put(':mediaId')
  @ApiOperation({
    summary: 'Update media by id.',
  })
  @ApiResponse({ status: 200, description: 'Multimedia updated Successfully.' })
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
  async updateMedia(
    @Param('mediaId') mediaId: number,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      headshot?: Express.Multer.File[];
    },

    @Req() req,
  ) {
    console.log(files);
    const { userId } = req.user;
    console.log(Object.keys(files));
    // Ensure exactly one file type is provided
    const fileTypes = Object.keys(files).filter(
      (key) => files[key]?.length > 0,
    );

    console.log('FileTypes', fileTypes);
    if (fileTypes.length !== 1) {
      throw new BadRequestException(
        'You must upload exactly one media type (image, video, or headshot).',
      );
    }

    const fileType = fileTypes[0]; // The provided file type
    const file = files[fileType][0]; // Get the single uploaded file

    const filePath = await uploadFile(file); // Call the upload function

    const uploadedFile = {
      url: filePath,
      name: file.originalname,
      type:
        fileType === 'images'
          ? 'image'
          : fileType === 'videos'
            ? 'video'
            : 'headshot',
    };

    // return this.mediaService.updateMedia(Number(mediaId), userId, uploadedFile);
  }
}
