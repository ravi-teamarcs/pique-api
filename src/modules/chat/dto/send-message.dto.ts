import { IsNumber } from 'class-validator';

export class SendMessage {
  @IsNumber({}, { message: 'Sender ID must be a number' })
  senderId: number;
  @IsNumber({}, { message: 'Receiver ID must be a number' })
  receiverId: number;

  message: any;
}
