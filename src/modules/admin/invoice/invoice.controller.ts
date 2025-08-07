import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, UserType } from './entities/invoices.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuardAdmin } from '../auth/roles.guard';
import { InvoiceQueryDto } from './Dto/invoice-query.dto';
import { UpdateInvoiceStatus } from './Dto/update-invoice-status.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('admin')
@Controller('admin/invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

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
  @Get('status/:status')
  async findByStatus(@Param('status') status: InvoiceStatus) {
    // return await this.invoiceService.findByStatus(status);
  }

  @Post('send/:id')
  @Roles('super-admin', 'venue-admin')
  sendInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.sendInvoice(id);
  }

  @Put(':invoiceId/status')
  async updateInvoiceStatus(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: UpdateInvoiceStatus,
  ) {
    return this.invoiceService.updateInvoiceStatus(invoiceId, dto);
  }

  // invoice.controller.ts

  @Patch(':id/apply-late-fee')
  async applyLateFee(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.applyLateFee(id);
  }

  @Get('testing-route')
  testingRoute() {
    return this.invoiceService.generateMonthlyInvoiceForVenue();
  }

  //  API to regenrate invoice
  @Patch(':id/regenerate')
  regenerateInvoiceById(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.regenerateInvoice(id);
  }

  // Email related APIs

  // To get List of Invoices (to send over Email)
  @Get('pending')
  async getPendingInvoices(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.invoiceService.getPendingInvoices(page, pageSize);
  }

  // API Should be hit in frontend with buffer
  @Post('send')
  @UseInterceptors(FileInterceptor('pdf'))
  async sendInvoiceEmail(
    @UploadedFile() file: Express.Multer.File,
    @Body('invoiceId') invoiceId: number,
  ) {
    return this.invoiceService.sendInvoiceWithPdf(file.buffer, +invoiceId);
  }
}
