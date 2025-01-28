import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('countries')
export class Countries {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  cc: string;
  @Column()
  phonecode: number;
}
