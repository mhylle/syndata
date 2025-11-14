import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { RecordEntity } from './record.entity';

@Entity('field_values')
export class FieldValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  recordId: string;

  @Column({ type: 'varchar', nullable: false })
  fieldName: string;

  @Column({ type: 'text', nullable: false })
  value: string;

  @Column({ type: 'varchar', nullable: false })
  dataType: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RecordEntity, record => record.fieldValues)
  record: RecordEntity;
}
