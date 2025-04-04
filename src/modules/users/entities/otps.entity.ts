import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index() // Fast lookup for verification
  email: string;

  @Column()
  otp: string; // Store as plain text OR hash

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP + INTERVAL 2 MINUTE',
  })
  expiresAt: Date;
}
