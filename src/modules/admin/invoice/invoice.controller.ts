import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { InvoiceQueryDto } from './Dto/invoice-query.dto';

@ApiTags('admin')
@Controller('admin/invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly geninvoiceService: GenerateInvoiceService,
  ) {}

  // Create a new invoice

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async create(@Body() dto: CreateInvoiceDto) {
    return await this.invoiceService.generateInvoice(dto);
  }

  @Roles('super-admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Get('getallinvoice')
  async findAll(@Req() req, @Query() dto: InvoiceQueryDto) {
    return await this.invoiceService.findAll(dto);
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

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuardAdmin)
  @Roles('super-admin')
  async remove(@Param('id') id: number) {
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
  async findByStatus(@Param('status') status: InvoiceStatus) {
    // return await this.invoiceService.findByStatus(status);
  }

  @Post('/send/:id')
  @Roles('super-admin', 'venue-admin')
  sendInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.sendInvoice(id);
  }

  @Put(':invoiceId/status')
  async updateInvoiceStatus(
    @Param('invoiceId') invoiceId: number,
    @Body('status') status: 'paid',
  ) {
    return this.invoiceService.updateInvoiceStatus(invoiceId, status);
  }
}
