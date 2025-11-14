import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ElementEntity } from './element.entity';
import { SyntheticSchemaEntity } from './synthetic-schema.entity';

@Entity('datasets')
export class DatasetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'jsonb', nullable: false })
  schemaDefinition: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, project => project.datasets)
  project: ProjectEntity;

  @OneToMany(() => ElementEntity, element => element.dataset)
  elements: ElementEntity[];

  @OneToOne(() => SyntheticSchemaEntity, (schema) => schema.dataset, {
    nullable: true,
    eager: false,
  })
  @JoinColumn()
  syntheticSchema?: SyntheticSchemaEntity;
}
