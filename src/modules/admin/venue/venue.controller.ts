import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto, CreateVenueRequestDto } from './Dto/create-venue.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { AddLocationDto } from './Dto/add-location.dto';
import { UpdateLocationDto } from './Dto/update-location.dto';
import { CreateNeighbourhoodDto } from './Dto/create-neighbourhood.dto';
import { UpdateNeighbourhoodDto } from './Dto/update-neighbourhood';
import { uploadFile } from 'src/common/middlewares/multer.middleware';
import { typeMap } from 'src/common/constants/media.constants';
import { UploadedFile } from 'src/common/types/media.type';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@ApiTags('admin')
@Controller('admin/venue')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @ApiOperation({ summary: 'Get all venue' })
  @ApiResponse({
    status: 200,
    description: 'Venue Retrival Sucessfully.',
  })
  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('all')
  async getAllVenues(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
  ) {
    return this.venueService.getAllVenue({ page, pageSize, search });
  }

  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('venuebyId/:userId')
  async getVenuesByUserId(@Param('userId') userId: number) {
    return this.venueService.getVenueByUserId(userId);
  }

  @ApiBearerAuth()
  @Post('create')
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin', 'venue-admin')
  async createVenue(
    @Body() dto: CreateVenueRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    let uploadedFiles: UploadedFile[] = [];
    const mimeTypeMap = {
      image: ['image/jpeg', 'image/png', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      headshot: ['image/jpeg', 'image/png'], // optional, if you want to distinguish
      event_headshot: ['image/jpeg', 'image/png'], // optional
    } as const;
    type FileType = keyof typeof mimeTypeMap;

    function getFileType(mimetype: string): FileType | null {
      for (const [key, mimeList] of Object.entries(mimeTypeMap) as [
        FileType,
        readonly string[],
      ][]) {
        if (mimeList.includes(mimetype)) {
          return key;
        }
      }
      return null;
    }

    if (files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = await uploadFile(file);
          const type = getFileType(file.mimetype); // Wait for the upload
          return {
            url: filePath,
            name: file.originalname,
            type,
          };
        }),
      );
    }

    return this.venueService.createVenue(dto, uploadedFiles);
  }

  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('update')
  async updateVenue(@Body() updateVenueDto: UpdateVenueDto): Promise<any> {
    console.log('updateVenue', updateVenueDto);
    return this.venueService.updateVenue(updateVenueDto);
  }

  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete(':id')
  async deleteVenue(@Param('id') id: number): Promise<void> {
    await this.venueService.deleteVenue(id);
  }

  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('search')
  searchEntertainers(@Query('query') query: string) {
    return this.venueService.searchEntertainers(query);
  }

  // Location Logic
  @ApiOperation({ summary: 'Add venue Location' })
  @ApiResponse({
    status: 201,
    description: 'Venue Added Successfully',
  })
  @Roles('super-admin', 'venue-admin')
  @Post('location')
  addLocation(@Body() dto: AddLocationDto) {
    return this.venueService.addVenueLocation(dto);
  }

  // @Roles('super-admin', 'venue-admin')
  // @Get('location/:id')
  // getvenueLocation(@Param('id') id: number) {
  //   return this.venueService.getVenueLocation(Number(id));
  // }

  @Roles('super-admin', 'venue-admin')
  @Put('location/:id')
  updateLocation(@Param('id') id: number, @Body() dto: UpdateLocationDto) {
    return this.venueService.updateLocation(Number(id), dto);
  }

  @Roles('super-admin', 'venue-admin')
  @Delete('location/:id')
  removeLocation(@Param('id') id: number) {
    return this.venueService.removeLocation(Number(id));
  }

  @Roles('super-admin', 'venue-admin')
  @Get(':id/neighbourhoods')
  getNeighbourhoods(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.getVenueNeighbourhoods(id);
  }

  @Roles('super-admin', 'venue-admin')
  @Post('neighbourhood')
  create(@Body() dto: CreateNeighbourhoodDto) {
    return this.venueService.create(dto);
  }

  @Roles('super-admin', 'venue-admin')
  @Patch('neighbourhood/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNeighbourhoodDto,
  ) {
    return this.venueService.update(id, dto);
  }
  @Roles('super-admin', 'venue-admin')
  @Delete('neighbourhood/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.removeNeighbourhood(id);
  }
}
