// src/settings/entities/setting.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'markup_type', default: 'fixed' }) // or 'percentage'
  markupType: 'fixed' | 'percentage';

  @Column('float', { name:'markup_value', default: 0 })
  markupValue: number;

  @Column({ default: true })
  isActive: boolean;
}
