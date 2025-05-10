import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto } from './Dto/create-venue.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { AddLocationDto } from './Dto/add-location.dto';
import { UpdateLocationDto } from './Dto/update-location.dto';

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

  @Roles('super-admin', 'venue-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('create')
  async createVenue(@Body() createVenueDto: CreateVenueDto) {
    return this.venueService.createVenue(createVenueDto);
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

  @Roles('super-admin', 'venue-admin')
  @Get('location/:id')
  getvenueLocation(@Param('id') id: number) {
    return this.venueService.getVenueLocation(Number(id));
  }

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
}
