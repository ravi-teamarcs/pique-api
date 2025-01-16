import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { EntertainerService } from './entertainer.service';
import { CreateEntertainerDto } from './dto/create-entertainer.dto';
import { UpdateEntertainerDto } from './dto/update-entertainer.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Entertainer } from './entities/entertainer.entity';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Entertainers')
@ApiBearerAuth()
@Controller('entertainers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntertainerController {
  constructor(private readonly entertainerService: EntertainerService) {}

  @Post()
  @Roles('entertainer') // Only users with the 'venue' role can access this route
  @ApiOperation({ summary: 'Create a entertainer' })
  @ApiResponse({
    status: 201,
    description: 'entertainer created.',
    type: Entertainer,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createEntertainerDto: CreateEntertainerDto) {
    return this.entertainerService.create(createEntertainerDto);
  }
  //   create(@Body() createEntertainerDto: CreateEntertainerDto, @Request() req) {
  //     console.log('---', req.user);
  //     return this.entertainerService.create(createEntertainerDto, req.user.id);
  //   }

  @Get()
  @ApiOperation({ summary: 'Get all entertainers for the logged-in user' })
  findAll(@Request() req) {
    return this.entertainerService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific entertainer by ID' })
  findOne(@Param('id') id: number, @Request() req) {
    return this.entertainerService.findOne(+id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific entertainer by ID' })
  update(
    @Param('id') id: number,
    @Body() updateEntertainerDto: UpdateEntertainerDto,
    @Request() req,
  ) {
    return this.entertainerService.update(
      +id,
      updateEntertainerDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific entertainer by ID' })
  remove(@Param('id') id: number, @Request() req) {
    return this.entertainerService.remove(+id, req.user.id);
  }
}
