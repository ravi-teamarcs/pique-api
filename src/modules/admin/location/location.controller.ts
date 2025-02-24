import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Countries } from './Entitiy/country.entity';
import { States } from './Entitiy/state.entity';

@ApiTags('admin')
@Controller('admin/location')
export class LocationController {
  constructor(private readonly locationService: LocationService) { }
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
  @Get('countries/Search')
  CountriesSearch(@Query('search') search?: string) {
    return this.locationService.CountriesSearch(search);
  }

  @Get('allowed-countries')
  getAllowedCountries() {
    return this.locationService.findAllowedCountries();
  }

  @Patch('allow/:id')
  allowCountry(@Param('id') id: number) {
    return this.locationService.allowCountry(+id);
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
