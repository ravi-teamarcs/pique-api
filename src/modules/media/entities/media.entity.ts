import { User } from '../../users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;
  @Column()
  name: string;
  @Column({ type: 'enum', enum: ['image', 'video', 'headshot'] })
  type: 'image' | 'video' | 'headshot';

  @Column({ nullable: true })
  refId: number;

  @Column({ nullable: true })
  eventId: number;
  // Relation to userId
  @ManyToOne(() => User, (user) => user.media, { onDelete: 'CASCADE' })
  user: User;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
