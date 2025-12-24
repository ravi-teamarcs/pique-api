import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './categories.entity';

@Entity('entertainer_category_subcategories')
export class EntertainerCategorySubcategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entertainer_id' })
  entertainerId: number;

  @Column({ type: 'simple-array', name: 'subcategory_ids' })
  subcategoryIds: number[];

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
