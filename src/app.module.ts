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

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

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
        logging: true,
        logger: 'advanced-console',
        maxQueryExecutionTime: 1000, // ✅ Good for debugging slow queries
        synchronize: false, // ❌ Set this to false in production
      }),
      // ✅ Injects ConfigService dependency
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// entities: [join(process.cwd(), 'dist/**/*.entity.js')],  for automatically fetching all the details
// TypeOrmModule.forRoot({
//   type: 'mysql',
//   host: process.env.DB_Host,
//   port: Number(process.env.DB_Port),
//   username: process.env.DB_User,
//   password: process.env.DB_Password,
//   database: process.env.DB_Name,
//   entities: [join(process.cwd(), 'dist/**/*.entity.js')],
//   logging: true,
//   logger: 'advanced-console',

//   maxQueryExecutionTime: 1000, // ✅
//   synchronize: true, //  Precaution : Must be False for Production.
// }),
