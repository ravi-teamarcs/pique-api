import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { VenueService } from './venue.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto } from './Dto/create-venue.dto';


@ApiTags('admin')
@Controller('admin/venue')
export class VenueController {
    constructor(private readonly vanueService: VenueService) { }



    @ApiOperation({ summary: 'Get all venue' })
    @ApiResponse({
        status: 200,
        description: 'Venue Retrival Sucessfully.',
    })

    @Get('all')
    async getAllVenues(
        @Req() req,
        @Query('page') page: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('search') search: string = '',
    ) {
        return this.vanueService.getAllVenue({ page, pageSize, search });
    }

    @Get('venuebyId/:userId')  // Using the userId as a parameter
    async getVenuesByUserId(@Param('userId') userId: number) {
        return this.vanueService.getVenueByUserId(userId);
    }

    @Post('create')
    async createVenue(@Body() createVenueDto: CreateVenueDto) {
        return this.vanueService.createVenue(createVenueDto);
    }

    @Post('update')
    async updateVenue(
        @Body() updateVenueDto: UpdateVenueDto,
    ): Promise<any> {
        return this.vanueService.updateVenue(updateVenueDto);
    }

    @Delete(':id')
    async deleteVenue(@Param('id') id: number): Promise<void> {
        await this.vanueService.deleteVenue(id);
    }

    @Get('search')
    searchEntertainers(@Query('query') query: string) {
      return this.vanueService.searchEntertainers(query);
    }
}
