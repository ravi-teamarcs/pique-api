import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_category_subcategory')
export class BookingCategorySubcategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id', type: 'int', nullable: false })
  categoryId: number;

  @Column({ name: 'subcategory_id', type: 'int', nullable: false })
  subCategoryId: number;

  @Column({ name: 'event_id', type: 'int', nullable: false })
  eventId: number;

  @Column({ name: 'booking_id', type: 'int', nullable: false })
  bookingId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
