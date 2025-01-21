import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Repository } from 'typeorm';
import { NotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Entertainer)
    private readonly entertainerRepository: Repository<Entertainer>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async sendNotification(notificationDto: NotificationDto) {
    // Code to Send Notification
    // Make a Query to find the entertainer  in db.
    // Message : [Venue] is requesting to book You.
    const { entertainerId } = notificationDto;
    const entertainer = await this.entertainerRepository.findOne({
      where: { id: entertainerId },
    });

    if (!entertainer) {
      throw new NotFoundException('Entertainer not found');
    }
    const notification = this.notificationRepository.create(notificationDto);
    await this.notificationRepository.save(notification);

    return notification;

    // Call this service inside venue/createBooking
  }
}
