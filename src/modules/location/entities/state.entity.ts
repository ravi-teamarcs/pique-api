import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('states')
export class States {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  country_id: number;
}
