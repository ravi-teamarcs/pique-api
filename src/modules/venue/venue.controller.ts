import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Venue } from './entities/venue.entity';
import { Roles } from '../auth/roles.decorator';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Post()
  @Roles('venue') // Only users with the 'venue' role can access this route
  @ApiOperation({ summary: 'Create a venue' })
  @ApiResponse({ status: 201, description: 'Venue created.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() createVenueDto: CreateVenueDto,
    @Request() req,
  ): Promise<Venue> {
    const userId = req.user.id;
    return this.venueService.create(createVenueDto, userId);
  }

  @Get()
  @Roles('venue') // Restrict access to the 'venue' role
  @ApiOperation({ summary: 'Get all venues for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of venues.', type: [Venue] })
  async findAll(@Request() req): Promise<Venue[]> {
    const userId = req.user.id;
    return this.venueService.findAllByUser(userId);
  }

  @Get(':id')
  @Roles('venue')
  @ApiOperation({ summary: 'Get a single venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details.', type: Venue })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findOne(@Param('id') id: number, @Request() req): Promise<Venue> {
    const userId = req.user.id;
    return this.venueService.findOneByUser(id, userId);
  }
}
