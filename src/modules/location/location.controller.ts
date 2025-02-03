import { Controller, Get, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Countries } from './entities/country.entity';
import { States } from './entities/state.entity';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}
  @ApiOperation({ summary: 'Get the list of all the  countries' })
  @ApiResponse({
    status: 200,
    description: 'Countries Fetched sucessfylly.',
    type: [Countries],
  })
  @Get('countries')
  getAllCountries() {
    return this.locationService.findAllCountries();
  }

  @ApiOperation({ summary: 'Get the list of all the State' })
  @ApiResponse({
    status: 200,
    description: 'States Fetched successfully.',
    type: [States],
  })
  @ApiQuery({
    name: 'countryId',
    required: false, // Mark it as optional
    type: Number,
    description: 'Filter state by country ID (optional)',
  })
  @Get('states')
  getAllStates(@Query('countryId') countryId: number) {
    return this.locationService.findAllStates(countryId);
  }
  @ApiOperation({ summary: 'Get the list of all the Cities' })
  @ApiResponse({
    status: 200,
    description: 'Cities Fetched sucessfylly.',
  })
  @ApiQuery({
    name: 'stateId',
    required: false, // Mark it as optional
    type: Number,
    description: 'Filter cities by state ID (optional)',
  })
  @Get('cities')
  getAllCities(@Query('stateId') stateId: number) {
    return this.locationService.findAllCities(stateId);
  }
}
