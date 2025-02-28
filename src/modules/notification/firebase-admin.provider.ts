import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Provider } from '@nestjs/common';

export const firebaseAdminProvider: Provider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: (configService: ConfigService) => {
    const defaultApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      }),
    });

    return { defaultApp };
  },
  inject: [ConfigService], // Inject ConfigService
};
