import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Invoice')
@Controller('invoice')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}
  @ApiOperation({ summary: 'Create an Invoice for Booking' })
  @ApiResponse({
    status: 201,
    description: 'Invoice  created  Successfully.',
  })
  // Route to Generate the Invoice for specific  Booking
  @Post()
  @Roles('findAll')
  createInvoice(@Request() req, @Body() invoicePayload: InvoiceDto) {
    const { refId } = req.user;
    const { eventIds, monthStr } = invoicePayload;
    return this.invoiceService.generateInvoice(refId, eventIds, monthStr);
  }

  @Post('/pdf')
  @Roles('findAll')
  generateInvoicePdf(@Request() req, @Body('invoiceId') invoiceId: number) {
    const { refId } = req.user;
    return this.invoiceService.generateInvoicePdf(invoiceId);
  }

  @ApiOperation({ summary: 'Get All Invoices' })
  @ApiResponse({
    status: 200,
    description: 'All Invoices fetched successfully.',
  })
  @Roles('findAll')
  @Get()
  getAllInvoices(@Request() req) {
    const { refId } = req.user;
    // return this.invoiceService.findAllInvoice(refId);
  }
}
