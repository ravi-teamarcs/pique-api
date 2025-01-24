import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoiceDto } from './dto/create-invoice.dto';

@ApiTags('invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}
  @ApiOperation({ summary: 'Create an Invoice for Booking' })
  @ApiResponse({
    status: 201,
    description: 'Invoice  created  Successfully.',
  })

  // Route to Generate the Invoice for specific  Booking
  @Post('create')
  createInvoice(@Body() invoiceDto: InvoiceDto) {
    return this.invoiceService.generateInvoice(invoiceDto);
  }

  @ApiOperation({ summary: 'Get All Invoices' })
  @ApiResponse({
    status: 200,
    description: 'All Invoices fetched successfully.',
  })
  @Get()
  getAllInvoices(@Param('userId') userId: number) {
    return this.invoiceService.findAllInvoice(userId);
  }
}
