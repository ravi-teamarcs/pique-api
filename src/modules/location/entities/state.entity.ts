import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('states')
export class States {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  country_id: number;
}
