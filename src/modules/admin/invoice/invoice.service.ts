import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice, InvoiceStatus, UserType } from './Entity/invoices.entity';
import { Repository } from 'typeorm';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';

@Injectable()
export class InvoiceService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
    ) {

    }
    // Create a new invoice
    async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
        // Ensure all values are valid decimal numbers
        const totalAmount = parseFloat(createInvoiceDto.total_amount.toString());
        const taxRate = parseFloat(createInvoiceDto.tax_rate.toString());
        
        // Validate totalAmount and taxRate to avoid NaN issues
        if (isNaN(totalAmount) || isNaN(taxRate)) {
            throw new Error("Invalid total_amount or tax_rate");
        }
    
        // Calculate tax
        const recalculatedTaxAmount = this.calculateTaxAmount(totalAmount, taxRate);
        const recalculatedTotalWithTax = totalAmount + recalculatedTaxAmount;
    
        // Use recalculated values if the provided ones are not valid
        const taxAmount = createInvoiceDto.tax_amount 
            ? parseFloat(createInvoiceDto.tax_amount.toString()) 
            : recalculatedTaxAmount;
        
        const totalWithTax = createInvoiceDto.total_with_tax 
            ? parseFloat(createInvoiceDto.total_with_tax.toString()) 
            : recalculatedTotalWithTax;
    
        // Create invoice object
        const invoice = this.invoiceRepository.create({
            ...createInvoiceDto,
            total_amount: totalAmount,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_with_tax: totalWithTax
        });
    
        return await this.invoiceRepository.save(invoice);
    }
    





    // Get all invoices
    async findAll(): Promise<Invoice[]> {
        return await this.invoiceRepository.find();
    }

    // Get a specific invoice by ID
    async findOne(id: number): Promise<Invoice> {
        return await this.invoiceRepository.findOne({ where: { id } });
    }

    // Update an existing invoice
    async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const updatedInvoice = { ...invoice, ...updateInvoiceDto };

        // Recalculate totals if tax-related fields are updated
        if (updateInvoiceDto.total_amount || updateInvoiceDto.tax_rate) {
            const tax_amount = this.calculateTaxAmount(updatedInvoice.total_amount, updatedInvoice.tax_rate);
            updatedInvoice.tax_amount = tax_amount;
            updatedInvoice.total_with_tax = updatedInvoice.total_amount + tax_amount;
        }

        return await this.invoiceRepository.save(updatedInvoice);
    }

    // Delete an invoice
    async remove(id: number): Promise<void> {
        const invoice = await this.findOne(id);
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        await this.invoiceRepository.delete(id);
    }

    // Calculate tax amount based on total amount and tax rate
    private calculateTaxAmount(totalAmount: number, taxRate: number): number {
        return (totalAmount * taxRate) / 100;
    }

    // Get invoices by user type (entertainer or venue)
    async findByUserType(userType: UserType): Promise<Invoice[]> {
        return await this.invoiceRepository.find({ where: { user_type: userType } });
    }

    // Get invoices by status (pending, paid, overdue)
    async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
        return await this.invoiceRepository.find({ where: { status } });
    }

    // Update invoice status (e.g., mark as paid)
    async updateStatus(id: number, status: InvoiceStatus): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        invoice.status = status;
        return await this.invoiceRepository.save(invoice);
    }

}
