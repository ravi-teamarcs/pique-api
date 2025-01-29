import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Access {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roleId: number;

  @Column()
  endpointId: number;
}
