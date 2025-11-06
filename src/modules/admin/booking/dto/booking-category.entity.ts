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

  @JoinColumn({ name: 'category_id' })
  categoryId: number;

  @JoinColumn({ name: 'subCategory_id' })
  subCategoryId: number;

  @JoinColumn({ name: 'event_id' })
  eventId: number;

  @JoinColumn({ name: 'booking_id' })
  bookingId: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
