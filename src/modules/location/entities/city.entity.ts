import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cities')
export class Cities {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  state_id: number;
}
