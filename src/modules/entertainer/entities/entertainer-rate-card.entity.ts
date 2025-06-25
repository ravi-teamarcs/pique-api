import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('entertainer_rate_cards')
export class EntertainerRateCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subcategory_id' })
  subcategoryId: number;

  @Column({ name: 'entertainer_id' })
  entertainerId: number;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'price_per_extra_30_min',
  })
  pricePerExtra30Min: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'update_at' })
  updatedAt: Date;
}
