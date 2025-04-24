import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // e.g., 'booking_request', 'payment_alert', etc.

  @Column({ type: 'text', nullable: true })
  data: Record<string, any>; // Additional metadata, like bookingId, etc.

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
