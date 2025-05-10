import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  Param,
  Get,
} from '@nestjs/common';
import { VenueDetailService } from './venue.details.service';
import { ContactPerson } from 'src/common/types/venue.type';
import { ContactDto } from './dto/add-contact-person.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('details')
@Controller('venue-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenueDetailsController {
  constructor(private readonly venueDetailService: VenueDetailService) {}
  @ApiOperation({ summary: 'Stores details of Contact Person' })
  @ApiResponse({ status: 201, description: 'Details Saved Successfully' })
  @Roles('findAll')
  @Post()
  async registerContact(@Request() req, @Body() payload: ContactDto) {
    const { refId } = req.user;
    return this.venueDetailService.registerContact(payload, refId);
  }

  @ApiOperation({ summary: 'Fetches the contactPerson detail for Venue' })
  @ApiResponse({ status: 200, description: 'Details Fetched Successfully' })
  @Roles('findAll')
  @Get(':id')
  async getContactDetails(@Request() req) {
    const { refId } = req.user;
    return this.venueDetailService.getContactDetails(refId);
  }
}
