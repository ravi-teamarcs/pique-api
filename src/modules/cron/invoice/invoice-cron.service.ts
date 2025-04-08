import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { isLastDayOfMonth } from 'date-fns';
import { Entertainer } from '../../entertainer/entities/entertainer.entity';
import { InvoiceService } from '../../invoice/invoice.service';
import { Repository } from 'typeorm';

@Injectable()
export class InvoiceCronService {
  constructor(
    private readonly invoiceService: InvoiceService,
    @InjectRepository(Entertainer)
    private readonly entRepository: Repository<Entertainer>,
  ) {}

  @Cron('59 23 * * *') // At 00:00 on day 1 of each month
  async runInvoiceCron() {
    const today = new Date();
    if (isLastDayOfMonth(today)) {
      const entertainerUserIds = await this.getEntertainerUserIds(); // from DB
      for (const userId of entertainerUserIds) {
        await this.invoiceService.generateInvoice(userId);
      }
    }
  }

  async getEntertainerUserIds() {
    try {
      const data = await this.entRepository
        .createQueryBuilder('entertainer')
        .leftJoin('users', 'user', 'user.id = entertainer.userId')
        .select('user.id As userId')
        .getRawMany();
      const entertainerUserIds = data?.map(({ userId }) => Number(userId));
      return entertainerUserIds;
    } catch (error) {
      throw new InternalServerErrorException({
        error: error.message,
        status: true,
      });
    }
  }
}
