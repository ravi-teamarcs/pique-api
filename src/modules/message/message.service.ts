import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class MessageService {
  async sendMessage() {
    try {
      return { message: 'Message sent Successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
