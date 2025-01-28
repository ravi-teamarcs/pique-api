import { Controller, Get, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @Get('states')
  getAllStates(@Query('countryId') countryId?: number) {
    return this.locationService.findAllStates(countryId);
  }
  @ApiOperation({ summary: 'Get the list of all the State' })
  @ApiResponse({
    status: 200,
    description: 'Countries Fetched sucessfylly.',
    // type: [Country],
  })
  @Get('cities')
  getAllCities(@Query('stateId') stateId?: number) {
    return this.locationService.findAllCities(stateId);
  }
}
