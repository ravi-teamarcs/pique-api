import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmToken } from './entities/fcm-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationQueryDto } from './dto/notification-query-dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(FcmToken)
    private readonly fcmTokenRepo: Repository<FcmToken>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async sendPush(notification: sendNotificationDTO, userId: number) {
    const { title, body, type, data } = notification;

    // First Store the notification in db.

    const notify = this.notificationRepo.create({ userId, title, body, type });
    await this.notificationRepo.save(notify);

    const res = await this.getUserTokens(userId);

    // let message = {
    //   tokens: res.data,
    //   notification: {
    //     title,
    //     body,
    //   },

    //   fcmOptions: {
    //     analyticsLabel: 'my-label',
    //   },
    //   android: { ttl: 3600 * 1000 },
    //   apns: {
    //     payload: {
    //       aps: {
    //         alert: {
    //           titleLocKey: 'key1',
    //           locKey: 'key2',
    //           locArgs: ['value1'],
    //         },
    //       },
    //       contentAvailable: true,
    //     },
    //   },
    // };

    const message = {
      tokens: res.data, // Array of device tokens

      notification: {
        title,
        body,
      },

      android: {
        ttl: 3600 * 1000,
        notification: {
          icon: 'ic_launcher', // must be present in app resources
          color: '#f45342',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Optional for Android
        },
      },

      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': '10',
        },
      },

      webpush: {
        notification: {
          title,
          body,
          icon: 'https://your-site.com/icon.png',
          click_action: 'https://your-site.com/notifications',
          vibrate: [100, 50, 100],
          badge: 'https://your-site.com/badge.png',
        },
        fcmOptions: {
          link: 'https://your-site.com/notifications',
        },
      },

      fcmOptions: {
        analyticsLabel: 'my-unified-push',
      },
    };

    try {
      const { responses } = await admin
        .messaging()
        .sendEachForMulticast(message);

      console.log(responses);

      const failedTokens = res.data.filter(
        (token, index) => !responses[index].success,
      );

      if (failedTokens.length > 0) {
        failedTokens.map(
          async (token) => await this.fcmTokenRepo.delete({ token }),
        );
      }

      return { message: 'Notification Sent successfully ', status: true };
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }

  async storeFcmToken(userId: number, token: string, deviceType: string) {
    const existingToken = await this.fcmTokenRepo.findOne({
      where: { userId, deviceType, token },
    });

    // If the token exists, no need to save again
    if (existingToken)
      return {
        message: 'Token exists Already',
        data: existingToken,
        status: true,
      };

    const newToken = this.fcmTokenRepo.create({ userId, token, deviceType });
    await this.fcmTokenRepo.save(newToken);
    return { message: 'Token saved successfully', status: true };
  }

  async removeFcmToken(token: string) {
    await this.fcmTokenRepo.delete({ token });
    return { message: 'Token removed successfully', status: true };
  }

  async getUserTokens(userId: number) {
    const tokensData = await this.fcmTokenRepo.find({
      where: { userId },
      select: ['token'],
    });
    console.log(tokensData, 'Token Data');
    const tokenList = tokensData.map((t) => t.token);
    return {
      message: 'Token fetched Successfully',
      data: tokenList,
      status: true,
    };
  }

  async getNotifications(userId: number, query: NotificationQueryDto) {
    const { unread, page = 1, pageSize = 20 } = query;

    try {
      const onlyUnread = unread;

      const where: any = { userId };
      if (onlyUnread) where.isRead = false;
      console.log('Where Query', where);
      const [data, total] = await this.notificationRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        message: 'notification fetched sucessfully',
        total,
        page,
        pageSize,
        data,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        messge: error.message,
        status: false,
      });
    }
  }

  async markAsRead(id: number) {
    const notification = await this.notificationRepo.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException({
        message: 'Notification not found',
        status: false,
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }

    return { message: 'Notification marked as read', status: true };
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return { message: 'All notifications marked as read', status: true };
  }
}
