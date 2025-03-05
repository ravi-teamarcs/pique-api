import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('category_icons')
export class CategoryIcon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  url: string;

  @Column()
  catId: number;
}
