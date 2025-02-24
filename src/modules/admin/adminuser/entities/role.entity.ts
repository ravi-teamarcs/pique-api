import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_roles') // This defines the table name in the database as 'roles'
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  role_name: string;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
