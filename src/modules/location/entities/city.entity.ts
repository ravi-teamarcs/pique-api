import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cities')
export class Cities {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  state_id: number;
}
