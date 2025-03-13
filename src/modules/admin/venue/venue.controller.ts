import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VenueService } from './venue.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateVenueDto } from './Dto/update-venue.dto';
import { CreateVenueDto } from './Dto/create-venue.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';



@ApiTags('admin')
@Controller('admin/venue')
export class VenueController {
    constructor(private readonly vanueService: VenueService) { }



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
        return this.vanueService.getAllVenue({ page, pageSize, search });
    }


    @Roles('super-admin', 'venue-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Get('venuebyId/:userId') 
    async getVenuesByUserId(@Param('userId') userId: number) {
        return this.vanueService.getVenueByUserId(userId);
    }



    @Roles('super-admin', 'venue-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Post('create')
    async createVenue(@Body() createVenueDto: CreateVenueDto) {
        
        return this.vanueService.createVenue(createVenueDto);
    }


    @Roles('super-admin', 'venue-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Post('update')
    async updateVenue(
        @Body() updateVenueDto: UpdateVenueDto,
    ): Promise<any> {
        console.log('updateVenue', updateVenueDto)
        return this.vanueService.updateVenue(updateVenueDto);
    }


    @Roles('super-admin', 'venue-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Delete(':id')
    async deleteVenue(@Param('id') id: number): Promise<void> {
        await this.vanueService.deleteVenue(id);
    }


    @Roles('super-admin', 'venue-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Get('search')
    searchEntertainers(@Query('query') query: string) {
        return this.vanueService.searchEntertainers(query);
    }
}
