// modules/cron/invoice/invoice-cron.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceService } from 'src/modules/invoice/invoice.service';

@Injectable()
export class InvoiceCronService {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Cron(CronExpression.EVERY_2ND_MONTH)
  async runInvoiceCron() {
    //     // const entertainerUserIds = await this.getEntertainerUserIds(); // from DB
    //     for (const userId of entertainerUserIds) {
    //       await this.invoiceService.generateMonthlyInvoicesForEntertainer(userId);
    //     }
    //   }
  }
}
