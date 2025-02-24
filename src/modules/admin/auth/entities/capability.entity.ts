import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admin_caps')
export class Capability {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;
}