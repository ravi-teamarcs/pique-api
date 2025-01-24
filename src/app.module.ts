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
      host: 'localhost',
      port: 3306,
      username: process.env.DB_User,
      password: process.env.DB_Password,
      database: process.env.DB_Name,
      entities: [join(process.cwd(), 'dist/**/*.entity.js')],
      // logging: true,
      // logger: 'advanced-console',
      synchronize: true, //  Precaution : Must be False for Production.
    }),

    AuthModule,
    UsersModule,
    VenueModule,
    EntertainerModule,
    BookingModule,
    MediaModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// entities: [join(process.cwd(), 'dist/**/*.entity.js')],  for automatically fetching all the details
