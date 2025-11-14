import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { RecordEntity } from './record.entity';

@Entity('element_instances')
export class ElementInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  recordId: string;

  @Column({ type: 'uuid', nullable: false })
  elementId: string;

  @Column({ type: 'integer', nullable: false })
  position: number;

  @Column({ type: 'varchar', nullable: false })
  transitionType: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RecordEntity, record => record.elementInstances)
  record: RecordEntity;
}
