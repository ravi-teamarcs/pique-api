import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column()
  parentId: number;

  @Column({ type: 'text', default: null })
  iconUrl: string;

  @Column({ type: 'varchar', length: 255 })
  catslug: string;
}
