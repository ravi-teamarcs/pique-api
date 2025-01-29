import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class EndPoints {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  endpoint: string;

  @Column()
  description: string;
}
