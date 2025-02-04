import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class BookingRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  venueId: number;
  @Column()
  userId: number;

  @Column({ type: 'time' })
  reqShowTime: string;

  @Column({ type: 'date' })
  reqShowDate: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ nullable: true })
  entertainerApproval: boolean;

  @Column({ nullable: true })
  adminApproval: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
