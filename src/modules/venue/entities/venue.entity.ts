import { Transform } from 'class-transformer';
import { User } from '../../users/entities/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('venue')
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  addressLine1: string;

  @Column()
  addressLine2: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  city: number;

  @Column()
  state: number;

  @Column()
  zipCode: string;

  @Column()
  country: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.venue, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  @Transform(({ value }) => Boolean(value))
  isParent: boolean;

  @Column({ nullable: true })
  parentId: number;
}

//Note in second callback first Argument Doesn't Matter it the second one that must be property name.
