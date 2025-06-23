import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('special_subcategory_prices')
export class SpecialSubcategoryPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subcategory_id' })
  subcategoryId: number;

  @Column({ type: 'date' })
  date: string; // Format: YYYY-MM-DD
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  specialPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'special_price_per_extra_30_min',
  })
  specialPricePerExtra30Min: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'update_at' })
  updatedAt: Date;
}
