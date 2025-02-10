import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JoinDto } from './dto/chat-join.dto';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private activeUsers = new Map<string, string>(); // socketId -> userId mapping

  constructor(private readonly chatService: ChatService) {}

  // When a user connects, send them their unread messages
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() { userId, receiverId }: JoinDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('inside Join ', userId, receiverId);
    this.activeUsers.set(client.id, userId);
    console.log(`User ${userId} connected with socket ${client.id}`);

    console.log(`Active Users `, this.activeUsers);
    // Fetch unread messages from MySQL
    const chatHistories = await this.chatService.getChatHistory(
      userId,
      receiverId,
    );

    // Send all previous chat history to the user
    chatHistories.data.forEach((msg) => {
      client.emit('receiveMessage', msg);
    });

    // Mark messages as delivered

    await this.chatService.markMessagesAsDelivered(userId);
  }

  // Handle sending messages
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: { senderId: string; receiverId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { senderId, receiverId, message } = data;
    // Save message in MySQL
    const savedMessage = await this.chatService.saveMessage(
      senderId,
      receiverId,
      message,
    );

    // Check if receiver is online
    const receiverSocketId = this.findSocketIdByUserId(receiverId);

    if (receiverSocketId) {
      // If receiver is online, mark the message as delivered
      await this.chatService.markMessagesAsDelivered(receiverId);

      // Send message in real-time to receiver
      this.server.to(receiverSocketId).emit('receiveMessage', savedMessage);
    } else {
      console.log(
        `User ${data.receiverId} is offline. Message stored in MySQL.`,
      );
    }

    return { status: 'Message sent' };
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() receiverId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await this.chatService.markMessagesAsRead(receiverId);
    console.log(`Messages marked as read for user: ${receiverId}`);
  }

  // Helper function to find socket ID by user ID
  private findSocketIdByUserId(userId: string): string | undefined {
    for (const [socketId, storedUserId] of this.activeUsers.entries()) {
      if (storedUserId === userId) {
        return socketId;
      }
    }
    return undefined;
  }

  // 🔴 When a user disconnects, remove them from the active users map
  handleDisconnect(client: Socket) {
    const userId = this.activeUsers.get(client.id);

    if (userId) {
      console.log(`User ${userId} disconnected, removing from active users.`);
      this.activeUsers.delete(client.id);
    }

    console.log('Active users after disconnect:', this.activeUsers);
  }
}
