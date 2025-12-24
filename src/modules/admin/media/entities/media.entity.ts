import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;
  @Column()
  name: string;
  @Column({
    type: 'enum',
    enum: ['image', 'video', 'headshot', 'event_headshot'],
  })
  type: 'image' | 'video' | 'headshot' | 'event_headshot';

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  eventId: number;
  // Relation to userId

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
