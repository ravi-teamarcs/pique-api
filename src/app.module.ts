import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VenueModule } from './modules/venue/venue.module';
import { EntertainerModule } from './modules/entertainer/entertainer.module';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { BookingModule } from './modules/booking/booking.module';
import { MediaModule } from './modules/media/media.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventModule } from './modules/event/event.module';
import { EmailModule } from './modules/Email/email.module';
import { LocationModule } from './modules/location/location.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_Host,
      port: Number(process.env.DB_Port),
      username: process.env.DB_User,
      password: process.env.DB_Password,
      database: process.env.DB_Name,
      entities: [join(process.cwd(), 'dist/**/*.entity.js')],
      // logging: true,
      // logger: 'advanced-console',
      synchronize: true, //  Precaution : Must be False for Production.
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// entities: [join(process.cwd(), 'dist/**/*.entity.js')],  for automatically fetching all the details
