import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice, InvoiceStatus, UserType } from './Entity/invoices.entity';
import { Like, Repository } from 'typeorm';
import { CreateInvoiceDto, UpdateInvoiceDto } from './Dto/create-invoice.dto';
import { Entertainer } from '../entertainer/Entitiy/entertainer.entity';
import { Venue } from '../venue/Entity/venue.entity';

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






    async findAll({
        page,
        pageSize,
        search,
    }: {
        page: number;
        pageSize: number;
        search?: string;
    }): Promise<any> {
        const skip = (page - 1) * pageSize; // Calculate records to skip

        const queryBuilder = this.invoiceRepository
            .createQueryBuilder("invoices")
            .leftJoinAndSelect("entertainers", "ent", "invoices.entertainer_id = ent.id")
            .leftJoinAndSelect("venue", "ven", "invoices.venue_id = ven.id")
            .leftJoinAndSelect("event", "eve", "invoices.event_id = eve.id")
            .select([
                "invoices.*",  // Select all fields from `invoices`
                "ent.name AS entertainer_name",
                "ven.*",
                "eve.title AS event_name",
            ]);

        const records = await queryBuilder.getRawMany();
        const total = await queryBuilder.getCount();

        return { records, total };


    }



    // Get a specific invoice by ID
    async findOne(id: number): Promise<Invoice> {
        return await this.invoiceRepository.findOne({ where: { id } });
    }

    // Update an existing invoice
    async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<any> {
        // const invoice = await this.invoiceRepository.findOne({ where: { id } });
        // if (!invoice) {
        //     throw new Error('Invoice not found');
        // }
    
        // // Merge existing invoice data with updated values
        // const updatedInvoice = { ...invoice, ...updateInvoiceDto };
    
        // // Recalculate totals if tax-related fields are updated
        // if (updateInvoiceDto.total_amount || updateInvoiceDto.tax_rate) {
        //     updatedInvoice.total_amount = updateInvoiceDto.total_amount
        //         ? parseFloat(updateInvoiceDto.total_amount)
        //         : invoice.total_amount;
        //     updatedInvoice.tax_rate = updateInvoiceDto.tax_rate
        //         ? parseFloat(updateInvoiceDto.tax_rate)
        //         : invoice.tax_rate;
    
        //     updatedInvoice.tax_amount = parseFloat(
        //         this.calculateTaxAmount(updatedInvoice.total_amount, updatedInvoice.tax_rate).toFixed(2)
        //     );
        //     updatedInvoice.total_with_tax = parseFloat((updatedInvoice.total_amount + updatedInvoice.tax_amount).toFixed(2));
        // }
    
        // // Ensure `payment_date` is properly formatted if provided
        // if (updateInvoiceDto.payment_date) {
        //     updatedInvoice.payment_date = new Date(updateInvoiceDto.payment_date).toISOString().split('T')[0];
        // }
    
        // return await this.invoiceRepository.save(updatedInvoice);
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
