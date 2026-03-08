import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('element_versions')
export class ElementVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  elementId: string;

  @Column({ type: 'int', nullable: false })
  version: number;

  @Column({ type: 'jsonb', nullable: false })
  definition: any;

  @Column({ type: 'varchar', nullable: true })
  changeDescription: string;

  @CreateDateColumn()
  createdAt: Date;
}
