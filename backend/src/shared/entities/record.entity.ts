import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ElementInstanceEntity } from './element-instance.entity';
import { FieldValueEntity } from './field-value.entity';

@Entity('records')
export class RecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'uuid', nullable: false })
  generationJobId: string;

  @Column({ type: 'jsonb', nullable: false })
  data: any;

  @Column({ type: 'boolean', default: false })
  isComposite: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ElementInstanceEntity, ei => ei.record)
  elementInstances: ElementInstanceEntity[];

  @OneToMany(() => FieldValueEntity, fv => fv.record)
  fieldValues: FieldValueEntity[];
}
