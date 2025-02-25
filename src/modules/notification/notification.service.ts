import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  async sendPush(notification: sendNotificationDTO) {
    const { deviceId, title, body, data } = notification;
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        token: deviceId,
        android: {
          ttl: 86400 * 1000, // 1 day in milliseconds
          notification: {
            clickAction: 'OPEN_ACTIVITY_1', // Corrected property name
          },
        },
        apns: {
          headers: {
            'apns-priority': '5', // Must be a string
          },
          payload: {
            aps: {
              category: 'NEW_MESSAGE_CATEGORY',
            },
          },
        },
        webpush: {
          headers: {
            TTL: '86400', // No syntax errors here
          },
        },
      };

      const res = await admin.messaging().send(message);
      console.log(res, 'Res of notification');

      return { message: 'Notification Sent successfully ', status: true };
      console.log(`Notification sent to ${deviceId}`);
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }
}

// const message = {
//   notification: {
//     title: 'Sparky says hello!'
//   },
//   android: {
//     notification: {
//       imageUrl: 'https://foo.bar.pizza-monster.png'
//     }
//   },
//   apns: {
//     payload: {
//       aps: {
//         'mutable-content': 1
//       }
//     },
//     fcm_options: {
//       image: 'https://foo.bar.pizza-monster.png'
//     }
//   },
//   webpush: {
//     headers: {
//       image: 'https://foo.bar.pizza-monster.png'
//     }
//   },
//   topic: topicName,
// };

// {
//   "message":{
//      "token":"bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1...",
//      "notification":{
//        "title":"Match update",
//        "body":"Arsenal goal in added time, score is now 3-0"
//      },
//      "android":{
//        "ttl":"86400s",
//        "notification"{
//          "click_action":"OPEN_ACTIVITY_1"
//        }
//      },
//      "apns": {
//        "headers": {
//          "apns-priority": "5",
//        },
//        "payload": {
//          "aps": {
//            "category": "NEW_MESSAGE_CATEGORY"
//          }
//        }
//      },
//      "webpush":{
//        "headers":{
//          "TTL":"86400"
//        }
//      }
//    }
//  }

//  const message = {
//   notification: {
//     title: title,
//     body: body,
//   },
//   token: deviceId,
//   data: {}, // You can pass additional data here
//   android: {
//     priority: 'high',
//     notification: {
//       sound: 'default',
//       channelId: 'default',
//     },
//   },
//   apns: {
//     headers: { 'apns-priority': '10' },
//     payload: { aps: { contentAvailable: true, sound: 'default' } },
//   },
// };
