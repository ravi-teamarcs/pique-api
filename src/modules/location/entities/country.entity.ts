import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('countries')
export class Countries {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 150, nullable: false })
  name: string;
  @Column({ type: 'varchar', length: 3, nullable: false })
  cc: string;
  @Column({ nullable: false })
  phonecode: number;
}
