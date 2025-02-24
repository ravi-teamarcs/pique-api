import { Injectable } from '@nestjs/common';
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
  async saveMessage(senderId: string, receiverId: string, message: string) {
    const newMessage = this.messageRepository.create({
      senderId,
      receiverId,
      message,
    });
    return await this.messageRepository.save(newMessage);
  }

  async getChatHistory(userId1: string, userId2: string) {
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
  }

  // Fetch unread messages for a user
  async getUnreadMessages(receiverId: string) {
    console.log('Inside chats service', receiverId);
    const res = await this.messageRepository.find({
      where: { receiverId, delivered: false },
      order: { createdAt: 'ASC' },
    });

    return res;
  }

  // Mark messages as delivered
  async markMessagesAsDelivered(receiverId: string) {
    await this.messageRepository.update(
      { receiverId, delivered: false },
      { delivered: true },
    );
  }

  async markMessagesAsRead(receiverId: string) {
    return await this.messageRepository.update(
      { receiverId, delivered: true, read: false },
      { read: true },
    );
  }
}
