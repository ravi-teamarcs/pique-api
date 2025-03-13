  import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

  @Entity('admin_role_caps')
  export class RoleCapability {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    role: string;

    @Column()
    user: string;

    @Column()
    capability_id: number;
  }
