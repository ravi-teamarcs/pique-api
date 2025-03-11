import { ContactPerson } from 'src/common/types/venue.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('venue_details')

export class VenueDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  venue_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'simple-json', nullable: true })
  contactPerson: ContactPerson;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
