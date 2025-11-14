import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('annotations')
export class AnnotationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  targetType: string;

  @Column({ type: 'uuid', nullable: false })
  targetId: string;

  @Column({ type: 'varchar', nullable: false })
  annotationType: string;

  @Column({ type: 'text', nullable: false })
  value: string;

  @CreateDateColumn()
  createdAt: Date;
}
