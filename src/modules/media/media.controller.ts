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
  Request,
  // UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MediaDto } from './dto/update-media.dto';
import { typeMap } from 'src/common/constants/media.constants';
import { UploadedFile } from 'src/common/types/media.type';
import { UploadMedia } from './dto/upload-media.dto';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Upload User Multimedia' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully.' })
  @Post('uploads/:id')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (req, file, callback) => {
        // Check file type from typeMap
        const fileType = typeMap[file.fieldname];

        if (!fileType) {
          return callback(
            new BadRequestException({
              message: 'Invalid file field name',
              status: false,
            }),
            false,
          );
        }

        // Restrict video file size to 500MB
        if (fileType === 'video' && file.size > 500 * 1024 * 1024) {
          return callback(
            new BadRequestException({
              message: 'Video file size cannot exceed 500 MB',
              status: false,
            }),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadMedia(
    @Param('id') userId: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() uploaddto?: UploadMedia,
  ) {
    let uploadedFiles: UploadedFile[] = [];

    if (files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = await uploadFile(file); // Wait for the upload
          return {
            url: filePath,
            name: file.originalname,
            type: typeMap[file.fieldname],
          };
        }),
      );
    }

    return this.mediaService.handleMediaUpload(
      userId,
      uploadedFiles,
      uploaddto,
    );
  }

  @Get('uploads/:id')
  @ApiOperation({
    summary: 'Get all the multimedia of the logged in User.',
  })
  @ApiResponse({ status: 200, description: 'Multimedia fetched Successfully.' })
  getAllMedia(@Param('id') id: number) {
    return this.mediaService.findAllMedia(id);
  }
  @Roles('findAll')
  @Put(':mediaId')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (req, file, callback) => {
        const fileType = typeMap[file.fieldname];

        if (!fileType) {
          return callback(
            new BadRequestException({
              message: 'Invalid file field name',
              status: false,
            }),
            false,
          );
        }

        // Restrict video file size to 500MB
        if (fileType === 'video' && file.size > 500 * 1024 * 1024) {
          return callback(
            new BadRequestException({
              message: 'Video file size cannot exceed 500 MB',
              status: false,
            }),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async updateMedia(
    @Req() req: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('mediaId') mediaId: number,
  ) {
    if (files.length !== 1) {
      throw new BadRequestException(
        'You must upload exactly one media type (image, video, or headshot).',
      );
    }

    // The provided file type
    const file = files[0]; // Get the single uploaded file
    const { fieldname } = file;
    const filePath = await uploadFile(file); // Call the upload function

    const uploadedFile = {
      url: filePath,
      name: file.originalname,
      type: typeMap[fieldname],
    };

    return this.mediaService.updateMedia(Number(mediaId), uploadedFile);
  }

  @Roles('findAll')
  @Delete(':id')
  removeMedia(@Param('id') id: number) {
    return this.mediaService.removeMedia(Number(id));
  }
}
