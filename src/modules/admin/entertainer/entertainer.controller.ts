import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EntertainerService } from './entertainer.service';

import { CreateCategoryDto } from './Dto/create-category.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateCategoryDto } from './Dto/update-category.dto';
import { CreateEntertainerDto } from './Dto/create-entertainer.dto';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateEntertainerDto } from './Dto/update-entertainer.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';


@ApiTags('admin')
@Controller('admin/entertainer')
export class EntertainerController {
    constructor(private readonly EntertainerService: EntertainerService) { }

    @Roles('super-admin', 'entertainer-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Get('all')
    async getEntertainer(@Req() req,
        @Query('page') page: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('search') search: string = '',) {
        return await this.EntertainerService.getAllEntertainers({ page, pageSize, search });
    }

    @Roles('super-admin', 'entertainer-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Post('createent')
    create(@Body() createEntertainerDto: CreateEntertainerDto): Promise<any> {

        return this.EntertainerService.create(createEntertainerDto);
    }


    @Roles('super-admin', 'entertainer-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Post('update')
    async updateEntertainer(

        @Body() updateEntertainerDto: UpdateEntertainerDto
    ) {
        return this.EntertainerService.update(updateEntertainerDto);
    }

    @Roles('super-admin', 'entertainer-admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuardAdmin)
    @Get('entertainerbyId/:userId')
    async getEntertainerByUserId(@Param('userId') userId: number) {


        return this.EntertainerService.getEntertainerByUserId(userId);
    }

    @Get('categorybyId')
    async categorybyId(@Query('id') id: number) {
        return this.EntertainerService.categorybyId(id);
    }


    @Get('maincategory')
    async getMainCategory(@Req() req
    ) {
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
        @Body() updateCategoryDto: UpdateCategoryDto
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
    @Post('updatestatusent')
    async updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
        console.log(updateStatusDto,"shhhhh")
        return this.EntertainerService.updateStatus(updateStatusDto);
    }

    // @Get('search')
    // searchEntertainers(@Query('query') query: string) {
    //   return this.EntertainerService.searchEntertainers(query);
    // }
}
