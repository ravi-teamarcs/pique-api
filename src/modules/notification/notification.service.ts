import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmToken } from './entities/fcm-token.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(FcmToken)
    private readonly fcmTokenRepo: Repository<FcmToken>,
  ) {}
  async sendPush(notification: sendNotificationDTO, userId: number) {
    const { title, body, data } = notification;

    const res = await this.getUserTokens(userId);
    let message = {
      tokens: res.data,
      notification: {
        title,
        body,
      },
      data: { title, body },

      fcmOptions: {
        analyticsLabel: 'my-label',
      },
      android: { ttl: 3600 * 1000 },
      apns: {
        payload: {
          aps: {
            alert: {
              titleLocKey: 'key1',
              locKey: 'key2',
              locArgs: ['value1'],
            },
          },
          contentAvailable: true,
        },
      },
    };

    try {
      const { responses } = await admin
        .messaging()
        .sendEachForMulticast(message);

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

    const tokenList = tokensData.map((t) => t.token);
    return {
      message: 'Token fetched Successfully',
      data: tokenList,
      status: true,
    };
  }
}
