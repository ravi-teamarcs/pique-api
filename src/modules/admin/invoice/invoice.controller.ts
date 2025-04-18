import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, UserType } from './entities/invoices.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GenerateInvoiceService } from 'src/common/invoice/generateinvoice.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';

@ApiTags('admin')
@Controller('admin/invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly geninvoiceService: GenerateInvoiceService,
  ) {}

  // Create a new invoice
  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Post('create')
  async create(@Body() createInvoiceDto: CreateInvoiceDto): Promise<any> {
    return await this.invoiceService.create(createInvoiceDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('generateinvoices')
  async generateInvoices(): Promise<void> {
    return await this.geninvoiceService.generateInvoices();
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('getallinvoice')
  async findAll(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search: string = '',
  ): Promise<Invoice[]> {
    return await this.invoiceService.findAll({ page, pageSize, search });
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('getbyid:id')
  async findOne(@Param('id') id: number): Promise<any> {
    return await this.invoiceService.findOne(id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<any> {
    return await this.invoiceService.update(id, updateInvoiceDto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return await this.invoiceService.remove(id);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('user-type/:userType')
  async findByUserType(
    @Param('userType') userType: UserType,
  ): Promise<Invoice[]> {
    return await this.invoiceService.findByUserType(userType);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('status/:status')
  async findByStatus(
    @Param('status') status: InvoiceStatus,
  ): Promise<Invoice[]> {
    return await this.invoiceService.findByStatus(status);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Put('status/:id')
  async updateStatus(
    @Param('id') id: number,
    @Body('status') status: InvoiceStatus,
  ): Promise<any> {
    return await this.invoiceService.updateStatus(id, status);
  }
}
