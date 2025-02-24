import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  async sendPush(notification: sendNotificationDTO) {
    const { deviceId, title, body } = notification;
    try {
      const message = {
        notification: {
          title: title,
          body: body,
        },
        token: deviceId,
        data: {}, // You can pass additional data here
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { contentAvailable: true, sound: 'default' } },
        },
      };

      // const response = await admin.messaging().send(message);
      return { message: 'Notification Sent successfully ', status: true };
      console.log(`Notification sent to ${deviceId}`);
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }
}
