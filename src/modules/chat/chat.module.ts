import { Module } from '@nestjs/common';
// import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ChatGateway } from './chat2.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  exports: [],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
