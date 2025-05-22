import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('neighbourhood')
export class Neighbourhood {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'contact_person' })
  contactPerson: string;

  @Column({ name: 'contact_number' })
  contactNumber: string;

  @Column({ name: 'venue_id' })
  venueId: number; // 👈
}
