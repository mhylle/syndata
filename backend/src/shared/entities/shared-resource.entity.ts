import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('shared_resources')
export class SharedResourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  resourceType: 'dataset' | 'element';

  @Column({ type: 'uuid', nullable: false })
  resourceId: string;

  @Column({ type: 'uuid', nullable: false })
  sourceProjectId: string;

  @Column({ type: 'varchar', nullable: false, default: 'public' })
  visibility: 'private' | 'public';

  @Column({ type: 'varchar', nullable: true })
  sharedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
