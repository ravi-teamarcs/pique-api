
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/Entity/users.entity';

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
  // Relation to userId
  @ManyToOne(() => User, (user) => user.media, { onDelete: 'CASCADE' })
  user: User;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
