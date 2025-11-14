import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DatasetEntity } from './dataset.entity';

@Entity('synthetic_schemas')
@Index(['datasetId'])
export class SyntheticSchemaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  datasetId: string;

  @ManyToOne(() => DatasetEntity, (dataset) => dataset.syntheticSchema, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'datasetId' })
  dataset: DatasetEntity;

  @Column('jsonb')
  schemaMetadata: {
    name: string;
    description: string;
    datasetType: string;
    llmModel: string;
    conversationTurns: number;
    overallConfidence: number;
    createdAt: string;
    conversionDuration: number;
  };

  @Column('jsonb')
  rootStructure: any; // Dynamic structure

  @Column('jsonb')
  generationRules: any[];

  @Column('jsonb')
  primitiveTypes: string[];

  @Column('jsonb')
  conversationHistory: Array<{
    turn: number;
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  @Column('jsonb')
  timingMetadata: {
    startTime: number;
    endTime: number;
    duration: number;
  };

  @Column('simple-array', { nullable: true })
  generationFilters?: string[]; // Stringified JSON

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
