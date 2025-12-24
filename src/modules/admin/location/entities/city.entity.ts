import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cities')
export class Cities {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 30, nullable: false })
  name: string;
  @Column({ nullable: false })
  state_id: number;
}
