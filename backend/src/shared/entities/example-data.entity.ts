import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('example_data')
export class ExampleDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  datasetId: string;

  @Column({ type: 'jsonb', nullable: false })
  data: any;

  @Column({ type: 'varchar', nullable: false })
  originalFormat: string;

  @Column({ type: 'varchar', nullable: true })
  originalFilename: string;

  @Column({ type: 'int', nullable: false })
  rowCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
