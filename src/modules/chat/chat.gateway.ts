// import {
//   WebSocketGateway,
//   SubscribeMessage,
//   MessageBody,
//   ConnectedSocket,
//   WebSocketServer,
//   OnGatewayDisconnect,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { ChatService } from './chat.service';
// import { JoinDto } from './dto/chat-join.dto';
// import { ConfigService } from '@nestjs/config';
// import {
//   InternalServerErrorException,
//   NotFoundException,
// } from '@nestjs/common';
// import * as jwt from 'jsonwebtoken';
// import * as crypto from 'crypto';
// import { SendMessage } from './dto/send-message.dto';

// @WebSocketGateway({
//   namespace: '/chat', // 👈 This sets the namespace to /chat
//   cors: {
//     origin: '*', // Allow any origin (for testing)
//     methods: ['GET', 'POST'],
//     allowedHeaders: ['Content-Type'],
//     credentials: true,
//   },
//   transports: ['websocket'], // Ensure it's using WebSocket transport
// })
// export class ChatGateway implements OnGatewayDisconnect {
//   @WebSocketServer() server: Server;
//   private activeUsers = new Map<string, number>(); // socketId -> userId mapping

//   constructor(
//     private readonly chatService: ChatService,
//     private configService: ConfigService,
//   ) {}

//   // On Opening the App send token in Query.(Main Logic app initiation)
//   async handleConnection(client: Socket) {
//     const token = client.handshake.query.token as string;

//     try {
//       const payload = jwt.verify(
//         token,
//         this.configService.get<string>('JWT_SECRET'),
//       );
//       const { sub } = payload;

//       this.activeUsers.set(client.id, Number(sub));
//     } catch (err) {
//       client.disconnect(); // invalid token
//     }
//   }

//   // When a user connects, send them their unread messages
//   @SubscribeMessage('join')
//   async handleJoin(
//     @MessageBody() { userId, receiverId }: JoinDto,
//     @ConnectedSocket() client: Socket,
//   ) {
//     const chatHistories = await this.chatService.getChatHistory(
//       userId,
//       receiverId,
//     );

//     // Send all previous chat history to the user
//     chatHistories.data.forEach((msg) => {
//       const decryptedMessage = this.decrypt(msg.message);
//       client.emit('receiveMessage', {
//         ...msg,
//         message: decryptedMessage,
//       });
//     });

//     // Mark messages as delivered(Dobut should be marked delivered to Sender)
//     await this.chatService.markMessagesAsDelivered(userId);
//   }

//   // Handle sending messages
//   @SubscribeMessage('sendMessage')
//   async handleMessage(
//     @MessageBody()
//     data: SendMessage,
//     @ConnectedSocket() client: Socket,
//   ) {
//     try {
//       const { senderId, receiverId, message } = data;

//       // Encrypting message before SendDing.
//       const encryptedMessage = this.encrypt(message);

//       // Save message in MySQL
//       const savedMessage = await this.chatService.saveMessage(
//         senderId,
//         receiverId,
//         encryptedMessage,
//       );

//       // Check if receiver is online
//       const receiverSocketId = this.findSocketIdByUserId(receiverId);

//       if (receiverSocketId) {
//         // If receiver is online, mark the message as delivered
//         // await this.chatService.markMessagesAsDelivered(receiverId);

//         // Send message in real-time to receiver
//         this.server.to(receiverSocketId).emit('receiveMessage', savedMessage);
//       } else {
//         console.log(
//           `User ${data.receiverId} is offline. Message stored in MySQL.`,
//         );
//       }

//       return { message: 'Message sent', status: true };
//     } catch (error) {
//       throw new InternalServerErrorException({
//         error: error.message,
//         status: false,
//       });
//     }
//   }
//   @SubscribeMessage('markAsRead')
//   async handleMarkAsRead(
//     @MessageBody() receiverId: number,
//     @ConnectedSocket() client: Socket,
//   ) {
//     await this.chatService.markMessagesAsRead(receiverId);
//     console.log(`Messages marked as read for user: ${receiverId}`);
//   }

//   // Helper function to find socket ID by user ID
//   private findSocketIdByUserId(userId: number): string | undefined {
//     for (const [socketId, storedUserId] of this.activeUsers.entries()) {
//       if (storedUserId === userId) {
//         return socketId;
//       }
//     }
//     return undefined;
//   }

//   //  When a user disconnects, remove them from the active users map
//   handleDisconnect(client: Socket) {
//     const userId = this.activeUsers.get(client.id);
//     if (userId) {
//       console.log(`User ${userId} disconnected, removing from active users.`);
//       this.activeUsers.delete(client.id);
//     }
//     console.log('Active users after disconnect:', this.activeUsers);
//   }

//   // Encryption Logic
//   private encrypt(text: string): string {
//     try {
//       const ENCRYPTION_KEY = this.configService.get<string>('CHAT_SECRET_KEY'); // 32 chars
//       const IV_LENGTH = 16;
//       const ALGO = 'aes-256-cbc';
//       if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
//         throw new Error('Encryption key must be 32 characters long');
//       }
//       const iv = crypto.randomBytes(IV_LENGTH);

//       const cipher = crypto.createCipheriv(
//         ALGO,
//         Buffer.from(ENCRYPTION_KEY),
//         iv,
//       );

//       let encrypted = cipher.update(text, 'utf-8');
//       encrypted = Buffer.concat([encrypted, cipher.final()]);

//       return iv.toString('hex') + ':' + encrypted.toString('hex');
//     } catch (error) {
//       throw new InternalServerErrorException({
//         error: error.message,
//         status: false,
//       });
//     }
//   }

//   private decrypt(text: string): string {
//     const ENCRYPTION_KEY = this.configService.get<string>('CHAT_SECRET_KEY');
//     const textParts = text.split(':');
//     const iv = Buffer.from(textParts.shift()!, 'hex');
//     const encryptedText = Buffer.from(textParts.join(':'), 'hex');
//     const decipher = crypto.createDecipheriv(
//       'aes-256-cbc',
//       Buffer.from(ENCRYPTION_KEY),
//       iv,
//     );
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return decrypted.toString();
//   }
// }
