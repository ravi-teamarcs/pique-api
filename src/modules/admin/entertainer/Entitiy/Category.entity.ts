import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('categories')
export class Categories {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column()
  parentId: number;

  @Column({ type: 'text' })
  iconUrl: string;

  @Column({ type: 'varchar', length: 255 })
  catslug: string;
}
