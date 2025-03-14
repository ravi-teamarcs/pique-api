import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entertainer } from '../entertainer/entities/entertainer.entity';
import { Notification } from './entities/notification.entity';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { FcmToken } from './entities/fcm-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Entertainer, Notification, FcmToken])],
  controllers: [NotificationController],
  providers: [NotificationService, firebaseAdminProvider],
  exports: [NotificationService],
})
export class NotificationModule {}
