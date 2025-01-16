import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { UsersController } from './modules/users/users.controller';
import { User } from './modules/users/entities/users.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { Venue } from './modules/venue/entities/venue.entity';
import { VenueModule } from './modules/venue/venue.module';
import { EntertainerModule } from './modules/entertainer/entertainer.module';
import { Entertainer } from './modules/entertainer/entities/entertainer.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'piquedb',
      entities: [User, Venue, Entertainer],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    VenueModule,
    EntertainerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
