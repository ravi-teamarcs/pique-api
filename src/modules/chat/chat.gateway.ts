import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  //   constructor(private readonly chatService: ChatService) {}

  // Join a chat room (userId as room)
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(userId);
    console.log(`User ${userId} joined chat`);
  }

  // Send Message (Venue <-> Entertainer)
  //   @SubscribeMessage('sendMessage')
  //   async handleMessage(
  //     @MessageBody()
  //     data: { senderId: string; receiverId: string; message: string },
  //     @ConnectedSocket() client: Socket,
  //   ) {
  //     // const savedMessage = await this.chatService.saveMessage(data);
  //     this.server.to(data.receiverId).emit('receiveMessage', message);
  //     return { status: 'Message sent' };
  //   }
}
