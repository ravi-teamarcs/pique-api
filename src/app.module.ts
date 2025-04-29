import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VenueModule } from './modules/venue/venue.module';
import { EntertainerModule } from './modules/entertainer/entertainer.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { BookingModule } from './modules/booking/booking.module';
import { MediaModule } from './modules/media/media.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventModule } from './modules/event/event.module';
import { EmailModule } from './modules/Email/email.module';
import { LocationModule } from './modules/location/location.module';
import { ChatModule } from './modules/chat/chat.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';
import { AdminModule } from './modules/admin/admin.module';
import { MulterModule } from '@nestjs/platform-express';
import { ToursModule } from './modules/tours/tours.module';
import { SeriesModule } from './modules/series/series.module';
import { InvoiceCronModule } from './modules/cron/invoice/invoice-cron.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MulterModule.register(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      // ✅ Injects ConfigService
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [join(process.cwd(), 'dist/**/*.entity.js')],
        // logging: true,
        // logger: 'advanced-console',
        // synchronize: true, // Set this to false in production
      }),
    }),

    ScheduleModule.forRoot(), // For Nest Js Schedule Cron Job
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    VenueModule,
    EntertainerModule,
    BookingModule,
    MediaModule,
    InvoiceModule,
    EventModule,
    EmailModule,
    LocationModule,
    ChatModule,
    GoogleCalendarModule,
    AdminModule,
    ToursModule,
    SeriesModule,
    InvoiceCronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
