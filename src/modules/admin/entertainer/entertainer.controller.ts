import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { EntertainerService } from './entertainer.service';

import { CreateCategoryDto } from './Dto/create-category.dto';
import { ApiTags } from '@nestjs/swagger';
import { UpdateCategoryDto } from './Dto/update-category.dto';
import { CreateEntertainerDto } from './Dto/create-entertainer.dto';
import { UpdateStatusDto } from './Dto/update-status.dto';
import { UpdateEntertainerDto } from './Dto/update-entertainer.dto';

@ApiTags('admin')
@Controller('admin/entertainer')
export class EntertainerController {
    constructor(private readonly EntertainerService: EntertainerService) { }

    @Get('all')
    async getEntertainer(@Req() req,
        @Query('page') page: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('search') search: string = '',) {
        return await this.EntertainerService.getAllEntertainers({ page, pageSize, search });
    }

    @Post('createent')
    create(@Body() createEntertainerDto: CreateEntertainerDto): Promise<any> {

        return this.EntertainerService.create(createEntertainerDto);
    }
    @Post('update')
    async updateEntertainer(

        @Body() updateEntertainerDto: UpdateEntertainerDto
    ) {
        return this.EntertainerService.update(updateEntertainerDto);
    }

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


    // Endpoint to create category
    @Post('createcat')
    async createMainCategory(@Body() createCategoryDto: CreateCategoryDto) {
        return this.EntertainerService.createCategory(createCategoryDto);
    }

    @Post('updatecat')
    async updateCategory(
        @Body() updateCategoryDto: UpdateCategoryDto
    ): Promise<any> {
        return this.EntertainerService.updateCategory(updateCategoryDto);
    }

    @Post('deletecat')
    remove(@Body() id: number) {
        return this.EntertainerService.removeCategory(id);
    }

    @Post('updatestatusent')
    async updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
        return this.EntertainerService.updateStatus(updateStatusDto);
    }

    // @Get('search')
    // searchEntertainers(@Query('query') query: string) {
    //   return this.EntertainerService.searchEntertainers(query);
    // }
}
