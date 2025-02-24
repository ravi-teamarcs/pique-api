import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Invoice, InvoiceStatus, UserType } from './Entity/invoices.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
@Controller('admin/invoice')
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) { }

    // Create a new invoice
    @Post('create')
    async create(@Body() createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
        return await this.invoiceService.create(createInvoiceDto);
    }

    // Get all invoices
    @Get('getallinvoice')
    async findAll(): Promise<Invoice[]> {
        return await this.invoiceService.findAll();
    }

    // Get a specific invoice by ID
    @Get('getbyid:id')
    async findOne(@Param('id') id: number): Promise<Invoice> {
        return await this.invoiceService.findOne(id);
    }

    // Update an existing invoice
    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
    ): Promise<Invoice> {
        return await this.invoiceService.update(id, updateInvoiceDto);
    }

    // Delete an invoice
    @Delete(':id')
    async remove(@Param('id') id: number): Promise<void> {
        return await this.invoiceService.remove(id);
    }

    // Get invoices by user type (entertainer or venue)
    @Get('user-type/:userType')
    async findByUserType(@Param('userType') userType: UserType): Promise<Invoice[]> {
        return await this.invoiceService.findByUserType(userType);
    }

    // Get invoices by status (pending, paid, overdue)
    @Get('status/:status')
    async findByStatus(@Param('status') status: InvoiceStatus): Promise<Invoice[]> {
        return await this.invoiceService.findByStatus(status);
    }

    // Update invoice status (e.g., mark as paid)
    @Put('status/:id')
    async updateStatus(
        @Param('id') id: number,
        @Body('status') status: InvoiceStatus,
    ): Promise<Invoice> {
        return await this.invoiceService.updateStatus(id, status);
    }
}
