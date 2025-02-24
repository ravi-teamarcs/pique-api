import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('adminuser')
  export class AdminUser {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    contact: string;
  
    @Column()
    password: string;
  
    @Column()
    role: string; 
  
    @CreateDateColumn()
    createdDate: Date;
  
    @UpdateDateColumn()
    updatedDate: Date;
  }
  