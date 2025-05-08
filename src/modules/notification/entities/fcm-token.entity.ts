import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('fcm_tokens')
export class FcmToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  token: string;

  @Column({ default: 'mobile' }) // Can store 'mobile' or 'web' if needed
  deviceType: string;

  @Column()
  userId: number;

  @Column({ nullable: true })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
