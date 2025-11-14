import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  venueId: number;

  @Column({ nullable: false })
  entId: number;

  @Column({ nullable: false })
  eventId: number;

  @Column({
    type: 'enum',
    enum: [
      'invited',
      'confirmed',
      'applied',
      'canceled',
      'completed',
      'rescheduled',
      'declined',
      'removed',
      'closed',
      'reinvited',
    ],
    default: 'invited',
  })
  status:
    | 'invited'
    | 'confirmed'
    | 'closed'
    | 'canceled'
    | 'applied'
    | 'completed'
    | 'rescheduled'
    | 'declined'
    | 'reinvited'
    | 'removed';

  //Added new Column
  @Column({ type: 'timestamp' })
  showStartDateTime: Date;

  @Column({ nullable: true })
  specialNotes: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @Column({ name: 'subcategory_id', nullable: true })
  subcategoryId: number;

  @Column({ default: false })
  emailSentOnClose: boolean;

  // @Column({ type: 'json', nullable: true })
  // entertainers: any;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
