import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('generation_jobs')
export class GenerationJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'uuid', nullable: false })
  datasetId: string;

  @Column({ type: 'varchar', nullable: false, default: 'pending' })
  status: string;

  @Column({ type: 'integer', nullable: false })
  count: number;

  @Column({ type: 'jsonb', nullable: false })
  config: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  completedAt: Date;
}
