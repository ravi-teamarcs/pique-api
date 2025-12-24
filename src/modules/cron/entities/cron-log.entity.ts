import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cron_job_logs')
export class CronJobLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'job_name' })
  jobName: string;

  @Column({ type: 'enum', enum: ['success', 'failure'] })
  status: 'success' | 'failure';

  @Column({ type: 'datetime', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'ended_at' })
  endedAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'varchar', length: 255, name: 'run_by', default: 'system' })
  runBy: string; // Optional: For manual vs automatic runs

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
