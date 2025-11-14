import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { DatasetEntity } from './dataset.entity';

@Entity('elements')
export class ElementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  datasetId: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  type: string;

  @Column({ type: 'jsonb', nullable: false })
  definition: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => DatasetEntity, dataset => dataset.elements)
  dataset: DatasetEntity;
}
