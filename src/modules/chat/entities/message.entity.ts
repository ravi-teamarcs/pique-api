import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  delivered: boolean; // To track offline messages

  @Column({ default: false })
  read: boolean; //

  @CreateDateColumn()
  createdAt: Date;
}
