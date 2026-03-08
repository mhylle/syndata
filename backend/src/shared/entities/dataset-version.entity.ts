import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('dataset_versions')
export class DatasetVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  datasetId: string;

  @Column({ type: 'int', nullable: false })
  version: number;

  @Column({ type: 'jsonb', nullable: false })
  schemaDefinition: any;

  @Column({ type: 'varchar', nullable: true })
  changeDescription: string;

  @CreateDateColumn()
  createdAt: Date;
}
