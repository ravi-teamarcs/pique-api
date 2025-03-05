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

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'int', nullable: true })
  parentId: number;

  @Column()
  iconUrl: string;

  @Column({ type: 'varchar', length: 100 })
  catslug: string;
}
