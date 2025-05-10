import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_change_request')
export class BookingRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  euid: number;
  @Column()
  vuid: number;

  @Column({ type: 'time' })
  reqShowTime: string;

  @Column({ type: 'date' })
  reqShowDate: string;

  @Column()
  reqEventId: number;
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
