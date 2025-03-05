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
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MediaDto } from './dto/update-media.dto';
import { typeMap } from 'src/common/constants/media.constants';
import { UploadedFile } from 'src/common/types/media.type';
import { multerConfig, MulterFile } from './multer.config';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Upload User Multimedia' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully.' })
  @Post('upload')
  @UseInterceptors(AnyFilesInterceptor())
  uploadFile(@UploadedFiles() files: Express.Multer.File[], @Request() req) {
    console.log(req.body);
    console.log(files); // Check if files are received
    return { message: 'Files uploaded successfully', files };
  }

  @Get('uploads')
  @ApiOperation({
    summary: 'Get all the multimedia of the logged in User.',
  })
  @ApiResponse({ status: 200, description: 'Multimedia fetched Successfully.' })
  getAllMedia(@Req() req: any, @Query('venueId') venueId?: number) {
    const { userId } = req.user;
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
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      headshot?: Express.Multer.File[];
    },

    @Req() req,
  ) {
    const { userId } = req.user;
    console.log(files);
    // Ensure exactly one file type is provided
    const fileTypes = Object.keys(files).filter(
      (key) => files[key]?.length > 0, // Because of multiple images
    );

    console.log('FileTypes', fileTypes);
    if (fileTypes.length !== 1) {
      throw new BadRequestException(
        'You must upload exactly one media type (image, video, or headshot).',
      );
    }

    const fileType = fileTypes[0]; // The provided file type
    const file = files[fileType][0]; // Get the single uploaded file
    const { fieldname } = file;
    const filePath = await uploadFile(file); // Call the upload function

    const uploadedFile = {
      url: filePath,
      name: file.originalname,
      type: typeMap[fieldname],
    };

    // console.log(uploadedFile);
    // return this.mediaService.updateMedia(Number(mediaId), userId, uploadedFile);
  }
}
