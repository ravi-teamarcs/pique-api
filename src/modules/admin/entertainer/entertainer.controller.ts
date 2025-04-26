import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EntertainerService } from './entertainer.service';

import { CreateCategoryDto } from './Dto/create-category.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateCategoryDto } from './Dto/update-category.dto';
import { CreateEntertainerDto } from './Dto/create-entertainer.dto';
import { UpdateStatusDto } from './Dto/update-status.dto';
import {
  UpdateAddressDto,
  UpdateEntertainerDto,
} from './Dto/update-entertainer.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { ApproveEntertainer } from './Dto/approve-entertainer.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { getFileType, UploadedFile } from 'src/common/types/media.type';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { typeMap } from 'src/common/constants/media.constants';

@ApiTags('admin')
@Controller('admin/entertainer')
export class EntertainerController {
  constructor(private readonly EntertainerService: EntertainerService) {}

  @Roles('super-admin', 'entertainer-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('all')
  async getEntertainer(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
  ) {
    return await this.EntertainerService.getAllEntertainers({
      page,
      pageSize,
      search,
    });
  }

  // New Flow for Creating Entertainer

  @Post('createent')
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin', 'entertainer-admin')
  async create(
    @Body() dto: CreateEntertainerDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    let uploadedFiles: UploadedFile[] = [];

    if (files?.length && files.length > 0) {
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
    return this.EntertainerService.createEntertainer(dto, uploadedFiles);
  }

  @Post('media/:id')
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async addMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    let uploadedFiles: UploadedFile[] = [];

    if (files?.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = await uploadFile(file); // Wait for the upload
          return {
            url: filePath,
            name: file.originalname,
            type: getFileType(file.mimetype),
          };
        }),
      );
    }
    return this.EntertainerService.uploadMedia(id, uploadedFiles);
  }

  @Patch('adddress/:id')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin', 'entertainer-admin')
  async updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.EntertainerService.updateAddress(id, dto);
  }
  @Patch('socialLinks/:id')
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin', 'entertainer-admin')
  async updateSocialLinks(
    @Param('id', ParseIntPipe) id: number,
    @Body('socialLinks') socialLinks: string,
  ) {
    return this.EntertainerService.updateSocialLinks(id, socialLinks);
  }

  // This need to be  changed
  @Roles('super-admin', 'entertainer-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('update')
  async updateEntertainer(@Body() updateEntertainerDto: UpdateEntertainerDto) {
    return this.EntertainerService.update(updateEntertainerDto);
  }

  @Patch('approval')
  async updateEntertainerStatus(@Body() dto: ApproveEntertainer) {
    return this.EntertainerService.approveEntertainer(dto);
  }

  @Roles('super-admin', 'entertainer-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('entertainerbyId/:id')
  async getEntertainerByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.EntertainerService.getEntertainerByentertainerId(id);
  }

  @Get('categorybyId')
  async categorybyId(@Query('id') id: number) {
    return this.EntertainerService.categorybyId(id);
  }

  @Get('maincategory')
  async getMainCategory(@Req() req) {
    return await this.EntertainerService.getMainCategory();
  }

  @Post('subcategory')
  async getSubCategory(@Body() body: { parentId: number }) {
    const { parentId } = body; // Extract parentId from the request body
    return await this.EntertainerService.getSubCategory(parentId); // Pass parentId to the service
  }

  @Roles('super-admin', 'entertainer-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('createcat')
  async createMainCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.EntertainerService.createCategory(createCategoryDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('updatecat')
  async updateCategory(
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<any> {
    return this.EntertainerService.updateCategory(updateCategoryDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('deletecat')
  remove(@Body() id: number) {
    return this.EntertainerService.removeCategory(id);
  }

  @Roles('super-admin', 'entertainer-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete(':id')
  async deleteEntertainer(@Param('id') id: string) {
    return this.EntertainerService.deleteEntertainer(Number(id));
  }
}
