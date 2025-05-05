import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity() // Table name
export class UserGoogleToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user: number;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text' })
  refreshToken: string;
  // user.entity.ts
  @Column({ nullable: true })
  calendarSyncedAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
