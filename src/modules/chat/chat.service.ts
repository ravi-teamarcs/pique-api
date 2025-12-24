import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // Save a new message
  async saveMessage(senderId: number, receiverId: number, message: string) {
    try {
      const newMessage = this.messageRepository.create({
        senderId,
        receiverId,
        message,
      });
      await this.messageRepository.save(newMessage);
      return { message: 'Message saved successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({
        Message: error.message,
        status: false,
      });
    }
  }

  // get Chat History
  async getChatHistory(userId1: number, userId2: number) {
    try {
      const history = await this.messageRepository.find({
        where: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
        order: { createdAt: 'DESC' },
        take: 1,
      });

      // take: pageSize,
      //   skip: (page - 1) * pageSize, // For pagination
      return {
        message: 'Chat history fetched Successfully',
        data: history,
        status: true,
      };
    } catch (error) {}
  }

  // Fetch unread messages for a user
  // async getUnreadMessages(receiverId: string) {
  //   const res = await this.messageRepository.find({
  //     where: { receiverId, delivered: false },
  //     order: { createdAt: 'ASC' },
  //   });

  //   return res;
  // }

  // Mark messages as delivered
  async markMessagesAsDelivered(receiverId: number) {
    await this.messageRepository.update(
      { receiverId, delivered: false },
      { delivered: true },
    );
  }

  async markMessagesAsRead(receiverId: number) {
    return await this.messageRepository.update(
      { receiverId, delivered: true, read: false },
      { read: true },
    );
  }
}
