# Syndata MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a flexible synthetic data generation platform supporting example-driven generation, rules-based constraints, element composition, and rich annotations.

**Architecture:** Modular backend (NestJS) with separate services for generation, validation, and annotation; Angular 19 frontend with feature-based organization; PostgreSQL database with JSONB storage for flexible data models.

**Tech Stack:** NestJS 11, Angular 19, PostgreSQL 17, TypeORM, RxJS, class-validator, pgvector

**Phases:**
1. Foundation (Infrastructure & Database)
2. Simple Generation (Basic data generation with rules)
3. Composite Generation (Element composition)
4. Frontend (UI for all features)
5. Testing & Polish (Comprehensive coverage)

---

## PHASE 1: FOUNDATION (INFRASTRUCTURE & DATABASE)

### Task 1: Create Database Schema

**Files:**
- Create: `backend/src/core/database/migrations/001-initial-schema.ts`
- Create: `backend/src/shared/entities/project.entity.ts`
- Create: `backend/src/shared/entities/dataset.entity.ts`
- Create: `backend/src/shared/entities/element.entity.ts`
- Create: `backend/src/shared/entities/generation-job.entity.ts`
- Create: `backend/src/shared/entities/record.entity.ts`
- Create: `backend/src/shared/entities/element-instance.entity.ts`
- Create: `backend/src/shared/entities/field-value.entity.ts`
- Create: `backend/src/shared/entities/annotation.entity.ts`

**Step 1: Create Project entity**

```typescript
// backend/src/shared/entities/project.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DatasetEntity } from './dataset.entity';

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DatasetEntity, dataset => dataset.project)
  datasets: DatasetEntity[];
}
```

**Step 2: Create Dataset entity**

```typescript
// backend/src/shared/entities/dataset.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ElementEntity } from './element.entity';

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
}
```

**Step 3: Create Element entity**

```typescript
// backend/src/shared/entities/element.entity.ts
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
```

**Step 4: Create GenerationJob entity**

```typescript
// backend/src/shared/entities/generation-job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('generation_jobs')
export class GenerationJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'uuid', nullable: false })
  datasetId: string;

  @Column({ type: 'varchar', nullable: false, default: 'pending' })
  status: string;

  @Column({ type: 'integer', nullable: false })
  count: number;

  @Column({ type: 'jsonb', nullable: false })
  config: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  completedAt: Date;
}
```

**Step 5: Create Record entity**

```typescript
// backend/src/shared/entities/record.entity.ts
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
```

**Step 6: Create ElementInstance entity**

```typescript
// backend/src/shared/entities/element-instance.entity.ts
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
```

**Step 7: Create FieldValue entity**

```typescript
// backend/src/shared/entities/field-value.entity.ts
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
```

**Step 8: Create Annotation entity**

```typescript
// backend/src/shared/entities/annotation.entity.ts
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
```

**Step 9: Update shared entities index**

```typescript
// backend/src/shared/entities/index.ts
// Export all entities
export { User } from './user.entity';
export { ProjectEntity } from './project.entity';
export { DatasetEntity } from './dataset.entity';
export { ElementEntity } from './element.entity';
export { GenerationJobEntity } from './generation-job.entity';
export { RecordEntity } from './record.entity';
export { ElementInstanceEntity } from './element-instance.entity';
export { FieldValueEntity } from './field-value.entity';
export { AnnotationEntity } from './annotation.entity';
```

**Step 10: Commit**

```bash
git add backend/src/shared/entities/
git commit -m "feat: Add Syndata entity models for projects, datasets, elements, generation, and records"
```

---

### Task 2: Create Data Transfer Objects (DTOs)

**Files:**
- Create: `backend/src/features/projects/dto/create-project.dto.ts`
- Create: `backend/src/features/projects/dto/update-project.dto.ts`
- Create: `backend/src/features/datasets/dto/create-dataset.dto.ts`
- Create: `backend/src/features/datasets/dto/create-element.dto.ts`
- Create: `backend/src/features/generation/dto/generate.dto.ts`

**Step 1: Create Project DTOs**

```typescript
// backend/src/features/projects/dto/create-project.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

```typescript
// backend/src/features/projects/dto/update-project.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

**Step 2: Create Dataset DTOs**

```typescript
// backend/src/features/datasets/dto/create-dataset.dto.ts
import { IsString, IsObject } from 'class-validator';

export class CreateDatasetDto {
  @IsString()
  name: string;

  @IsObject()
  schema: any;
}
```

```typescript
// backend/src/features/datasets/dto/create-element.dto.ts
import { IsString, IsObject } from 'class-validator';

export class CreateElementDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsObject()
  definition: any;
}
```

**Step 3: Create Generation DTOs**

```typescript
// backend/src/features/generation/dto/generate.dto.ts
import { IsUUID, IsNumber, IsObject, IsOptional } from 'class-validator';

export class GenerateDto {
  @IsUUID()
  datasetId: string;

  @IsNumber()
  count: number;

  @IsOptional()
  @IsObject()
  rules?: any;

  @IsOptional()
  @IsObject()
  compositionConfig?: any;
}
```

**Step 4: Commit**

```bash
git add backend/src/features/*/dto/
git commit -m "feat: Add DTOs for projects, datasets, elements, and generation"
```

---

### Task 3: Create Core Services (Foundation)

**Files:**
- Create: `backend/src/features/projects/services/project.service.ts`
- Create: `backend/src/features/projects/services/project.service.spec.ts`
- Create: `backend/src/features/datasets/services/dataset.service.ts`
- Create: `backend/src/features/datasets/services/dataset.service.spec.ts`

**Step 1: Create ProjectService**

```typescript
// backend/src/features/projects/services/project.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../../../shared/entities/project.entity';
import { CreateProjectDto, UpdateProjectDto } from '../dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<ProjectEntity> {
    const project = this.projectRepository.create(createProjectDto);
    return this.projectRepository.save(project);
  }

  async findAll(): Promise<ProjectEntity[]> {
    return this.projectRepository.find();
  }

  async findOne(id: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectEntity> {
    await this.findOne(id);
    await this.projectRepository.update(id, updateProjectDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.projectRepository.delete(id);
  }
}
```

**Step 2: Create ProjectService tests**

```typescript
// backend/src/features/projects/services/project.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { ProjectEntity } from '../../../shared/entities/project.entity';
import { NotFoundException } from '@nestjs/common';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should create a project', async () => {
    const createDto = { name: 'Test Project', description: 'A test' };
    const project = { id: 'uuid-1', ...createDto, createdAt: new Date() };

    mockRepository.create.mockReturnValue(project);
    mockRepository.save.mockResolvedValue(project);

    const result = await service.create(createDto);
    expect(result).toEqual(project);
    expect(mockRepository.create).toHaveBeenCalledWith(createDto);
  });

  it('should find all projects', async () => {
    const projects = [{ id: 'uuid-1', name: 'Project 1' }];
    mockRepository.find.mockResolvedValue(projects);

    const result = await service.findAll();
    expect(result).toEqual(projects);
  });

  it('should find one project', async () => {
    const project = { id: 'uuid-1', name: 'Project 1' };
    mockRepository.findOne.mockResolvedValue(project);

    const result = await service.findOne('uuid-1');
    expect(result).toEqual(project);
  });

  it('should throw NotFoundException when project not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('should update a project', async () => {
    const project = { id: 'uuid-1', name: 'Updated Project' };
    mockRepository.findOne.mockResolvedValue(project);

    const result = await service.update('uuid-1', { name: 'Updated Project' });
    expect(result).toEqual(project);
  });

  it('should delete a project', async () => {
    const project = { id: 'uuid-1', name: 'Project 1' };
    mockRepository.findOne.mockResolvedValue(project);

    await service.remove('uuid-1');
    expect(mockRepository.delete).toHaveBeenCalledWith('uuid-1');
  });
});
```

**Step 3: Create DatasetService**

```typescript
// backend/src/features/datasets/services/dataset.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatasetEntity } from '../../../shared/entities/dataset.entity';
import { ElementEntity } from '../../../shared/entities/element.entity';
import { CreateDatasetDto, CreateElementDto } from '../dto';

@Injectable()
export class DatasetService {
  constructor(
    @InjectRepository(DatasetEntity)
    private datasetRepository: Repository<DatasetEntity>,
    @InjectRepository(ElementEntity)
    private elementRepository: Repository<ElementEntity>,
  ) {}

  async create(projectId: string, createDatasetDto: CreateDatasetDto): Promise<DatasetEntity> {
    const dataset = this.datasetRepository.create({
      projectId,
      ...createDatasetDto,
    });
    return this.datasetRepository.save(dataset);
  }

  async findByProject(projectId: string): Promise<DatasetEntity[]> {
    return this.datasetRepository.find({ where: { projectId } });
  }

  async findOne(id: string): Promise<DatasetEntity> {
    const dataset = await this.datasetRepository.findOne({ where: { id } });
    if (!dataset) {
      throw new NotFoundException(`Dataset with ID ${id} not found`);
    }
    return dataset;
  }

  async addElement(datasetId: string, createElementDto: CreateElementDto): Promise<ElementEntity> {
    const dataset = await this.findOne(datasetId);
    const element = this.elementRepository.create({
      datasetId,
      ...createElementDto,
    });
    return this.elementRepository.save(element);
  }

  async getElements(datasetId: string): Promise<ElementEntity[]> {
    return this.elementRepository.find({ where: { datasetId } });
  }

  async getElement(elementId: string): Promise<ElementEntity> {
    const element = await this.elementRepository.findOne({ where: { id: elementId } });
    if (!element) {
      throw new NotFoundException(`Element with ID ${elementId} not found`);
    }
    return element;
  }
}
```

**Step 4: Create DatasetService tests**

```typescript
// backend/src/features/datasets/services/dataset.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatasetService } from './dataset.service';
import { DatasetEntity } from '../../../shared/entities/dataset.entity';
import { ElementEntity } from '../../../shared/entities/element.entity';
import { NotFoundException } from '@nestjs/common';

describe('DatasetService', () => {
  let service: DatasetService;
  let mockDatasetRepository: any;
  let mockElementRepository: any;

  beforeEach(async () => {
    mockDatasetRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockElementRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetService,
        {
          provide: getRepositoryToken(DatasetEntity),
          useValue: mockDatasetRepository,
        },
        {
          provide: getRepositoryToken(ElementEntity),
          useValue: mockElementRepository,
        },
      ],
    }).compile();

    service = module.get<DatasetService>(DatasetService);
  });

  it('should create a dataset', async () => {
    const createDto = { name: 'Test Dataset', schema: { fields: [] } };
    const dataset = { id: 'uuid-1', projectId: 'proj-1', ...createDto, createdAt: new Date() };

    mockDatasetRepository.create.mockReturnValue(dataset);
    mockDatasetRepository.save.mockResolvedValue(dataset);

    const result = await service.create('proj-1', createDto);
    expect(result).toEqual(dataset);
  });

  it('should find datasets by project', async () => {
    const datasets = [{ id: 'uuid-1', projectId: 'proj-1', name: 'Dataset 1' }];
    mockDatasetRepository.find.mockResolvedValue(datasets);

    const result = await service.findByProject('proj-1');
    expect(result).toEqual(datasets);
  });

  it('should find one dataset', async () => {
    const dataset = { id: 'uuid-1', projectId: 'proj-1', name: 'Dataset 1' };
    mockDatasetRepository.findOne.mockResolvedValue(dataset);

    const result = await service.findOne('uuid-1');
    expect(result).toEqual(dataset);
  });

  it('should add element to dataset', async () => {
    const dataset = { id: 'uuid-1', projectId: 'proj-1' };
    const createElementDto = { name: 'Element 1', type: 'text', definition: {} };
    const element = { id: 'elem-1', datasetId: 'uuid-1', ...createElementDto, createdAt: new Date() };

    mockDatasetRepository.findOne.mockResolvedValue(dataset);
    mockElementRepository.create.mockReturnValue(element);
    mockElementRepository.save.mockResolvedValue(element);

    const result = await service.addElement('uuid-1', createElementDto);
    expect(result).toEqual(element);
  });
});
```

**Step 5: Commit**

```bash
git add backend/src/features/projects/services/ backend/src/features/datasets/services/
git commit -m "feat: Add ProjectService and DatasetService with comprehensive tests"
```

---

### Task 4: Create API Controllers

**Files:**
- Create: `backend/src/features/projects/controllers/project.controller.ts`
- Create: `backend/src/features/datasets/controllers/dataset.controller.ts`

**Step 1: Create ProjectController**

```typescript
// backend/src/features/projects/controllers/project.controller.ts
import { Controller, Get, Post, Body, Put, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project' })
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }
}
```

**Step 2: Create DatasetController**

```typescript
// backend/src/features/datasets/controllers/dataset.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatasetService } from '../services/dataset.service';
import { CreateDatasetDto, CreateElementDto } from '../dto';

@ApiTags('Datasets')
@Controller('projects/:projectId/datasets')
export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dataset' })
  create(@Param('projectId') projectId: string, @Body() createDatasetDto: CreateDatasetDto) {
    return this.datasetService.create(projectId, createDatasetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get datasets for a project' })
  findByProject(@Param('projectId') projectId: string) {
    return this.datasetService.findByProject(projectId);
  }

  @Get(':datasetId')
  @ApiOperation({ summary: 'Get a specific dataset' })
  findOne(@Param('datasetId') datasetId: string) {
    return this.datasetService.findOne(datasetId);
  }

  @Post(':datasetId/elements')
  @ApiOperation({ summary: 'Add element to dataset' })
  addElement(@Param('datasetId') datasetId: string, @Body() createElementDto: CreateElementDto) {
    return this.datasetService.addElement(datasetId, createElementDto);
  }

  @Get(':datasetId/elements')
  @ApiOperation({ summary: 'Get elements for a dataset' })
  getElements(@Param('datasetId') datasetId: string) {
    return this.datasetService.getElements(datasetId);
  }

  @Get(':datasetId/elements/:elementId')
  @ApiOperation({ summary: 'Get a specific element' })
  getElement(@Param('elementId') elementId: string) {
    return this.datasetService.getElement(elementId);
  }
}
```

**Step 3: Update AppModule to import new features**

```typescript
// backend/src/app.module.ts - Update the imports array
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { LoggerModule } from './common/logging/logger.module';
import { HealthModule } from './core/health/health.module';
import { MigrationsModule } from './core/migrations/migrations.module';
import { ProjectController } from './features/projects/controllers/project.controller';
import { ProjectService } from './features/projects/services/project.service';
import { DatasetController } from './features/datasets/controllers/dataset.controller';
import { DatasetService } from './features/datasets/services/dataset.service';
import { ProjectEntity, DatasetEntity, ElementEntity, GenerationJobEntity, RecordEntity, ElementInstanceEntity, FieldValueEntity, AnnotationEntity } from './shared/entities';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('environment') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([
      ProjectEntity,
      DatasetEntity,
      ElementEntity,
      GenerationJobEntity,
      RecordEntity,
      ElementInstanceEntity,
      FieldValueEntity,
      AnnotationEntity,
    ]),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl') || 60000,
          limit: configService.get<number>('rateLimit.limit') || 100,
        },
      ],
    }),
    AuthModule,
    HealthModule,
    MigrationsModule,
  ],
  controllers: [AppController, ProjectController, DatasetController],
  providers: [AppService, ProjectService, DatasetService],
})
export class AppModule {}
```

**Step 4: Commit**

```bash
git add backend/src/features/*/controllers/ backend/src/app.module.ts
git commit -m "feat: Add ProjectController and DatasetController with API endpoints"
```

---

## PHASE 2: SIMPLE GENERATION (BASIC DATA GENERATION)

### Task 5: Create Validation Engine

**Files:**
- Create: `backend/src/features/generation/services/validation.service.ts`
- Create: `backend/src/features/generation/services/validation.service.spec.ts`

**Step 1: Create ValidationService**

```typescript
// backend/src/features/generation/services/validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationService {
  validateSchema(schema: any): void {
    if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
      throw new BadRequestException('Schema must contain fields array');
    }

    schema.fields.forEach((field: any, index: number) => {
      if (!field.name || !field.type) {
        throw new BadRequestException(
          `Field at index ${index} must have name and type`,
        );
      }

      const validTypes = ['string', 'number', 'date', 'boolean', 'email'];
      if (!validTypes.includes(field.type)) {
        throw new BadRequestException(
          `Field ${field.name} has invalid type: ${field.type}`,
        );
      }
    });
  }

  validateRules(rules: any, schema: any): void {
    if (!rules) return;

    const fieldNames = schema.fields.map((f: any) => f.name);

    Object.keys(rules).forEach((fieldName) => {
      if (!fieldNames.includes(fieldName)) {
        throw new BadRequestException(
          `Rule for unknown field: ${fieldName}`,
        );
      }
    });
  }

  validateConstraint(value: any, field: any): boolean {
    if (!field.constraints) return true;

    const { constraints } = field;

    if (constraints.min !== undefined && value < constraints.min) {
      return false;
    }

    if (constraints.max !== undefined && value > constraints.max) {
      return false;
    }

    if (constraints.pattern) {
      const regex = new RegExp(constraints.pattern);
      if (!regex.test(value)) {
        return false;
      }
    }

    if (constraints.allowedValues && !constraints.allowedValues.includes(value)) {
      return false;
    }

    return true;
  }
}
```

**Step 2: Create ValidationService tests**

```typescript
// backend/src/features/generation/services/validation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { BadRequestException } from '@nestjs/common';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateSchema', () => {
    it('should accept valid schema', () => {
      const schema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'age', type: 'number' },
        ],
      };

      expect(() => service.validateSchema(schema)).not.toThrow();
    });

    it('should reject schema without fields', () => {
      expect(() => service.validateSchema({})).toThrow(BadRequestException);
    });

    it('should reject field without name', () => {
      const schema = {
        fields: [{ type: 'string' }],
      };

      expect(() => service.validateSchema(schema)).toThrow(BadRequestException);
    });

    it('should reject invalid field type', () => {
      const schema = {
        fields: [{ name: 'id', type: 'invalid_type' }],
      };

      expect(() => service.validateSchema(schema)).toThrow(BadRequestException);
    });
  });

  describe('validateRules', () => {
    it('should accept valid rules', () => {
      const schema = { fields: [{ name: 'age', type: 'number' }] };
      const rules = { age: { min: 18 } };

      expect(() => service.validateRules(rules, schema)).not.toThrow();
    });

    it('should reject rule for unknown field', () => {
      const schema = { fields: [{ name: 'age', type: 'number' }] };
      const rules = { unknown_field: {} };

      expect(() => service.validateRules(rules, schema)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateConstraint', () => {
    it('should pass value within range', () => {
      const field = { constraints: { min: 18, max: 100 } };
      expect(service.validateConstraint(35, field)).toBe(true);
    });

    it('should fail value below min', () => {
      const field = { constraints: { min: 18 } };
      expect(service.validateConstraint(10, field)).toBe(false);
    });

    it('should validate pattern', () => {
      const field = { constraints: { pattern: '^[A-Z]+$' } };
      expect(service.validateConstraint('ABC', field)).toBe(true);
      expect(service.validateConstraint('abc', field)).toBe(false);
    });
  });
});
```

**Step 3: Commit**

```bash
git add backend/src/features/generation/services/validation.service*
git commit -m "feat: Add ValidationService for schema and rule validation"
```

---

### Task 6: Create Pattern Analyzer

**Files:**
- Create: `backend/src/features/generation/services/pattern-analyzer.service.ts`
- Create: `backend/src/features/generation/services/pattern-analyzer.service.spec.ts`

**Step 1: Create PatternAnalyzerService**

```typescript
// backend/src/features/generation/services/pattern-analyzer.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PatternAnalyzerService {
  analyzeFieldDistribution(values: any[]): any {
    if (!values || values.length === 0) {
      return null;
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;

    // Calculate mean
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Calculate standard deviation
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    // Calculate quartiles
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    return {
      min: sortedValues[0],
      max: sortedValues[n - 1],
      mean: Math.round(mean * 100) / 100,
      median: sortedValues[q2Index],
      stddev: Math.round(stddev * 100) / 100,
      q1: sortedValues[q1Index],
      q3: sortedValues[q3Index],
      count: n,
    };
  }

  analyzeStringPatterns(values: string[]): any {
    if (!values || values.length === 0) {
      return null;
    }

    const lengths = values.map((v) => v.length);
    const distribution = this.analyzeFieldDistribution(lengths);

    return {
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      avgLength: Math.round(
        (lengths.reduce((a, b) => a + b, 0) / lengths.length) * 100,
      ) / 100,
      distribution,
      samples: values.slice(0, 5),
    };
  }

  detectFieldRelationships(records: any[], schema: any): Map<string, any> {
    const relationships = new Map();

    if (!records || records.length < 2) {
      return relationships;
    }

    // Simple relationship detection: fields that are frequently non-null together
    const fields = schema.fields.map((f: any) => f.name);

    fields.forEach((fieldA) => {
      fields.forEach((fieldB) => {
        if (fieldA !== fieldB) {
          const coOccurrence = records.filter(
            (r) => r[fieldA] !== null && r[fieldB] !== null,
          ).length;
          const correlation =
            (coOccurrence / records.length) * 100;

          if (correlation > 75) {
            const key = `${fieldA}->${fieldB}`;
            relationships.set(key, { correlation });
          }
        }
      });
    });

    return relationships;
  }
}
```

**Step 2: Create PatternAnalyzerService tests**

```typescript
// backend/src/features/generation/services/pattern-analyzer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PatternAnalyzerService } from './pattern-analyzer.service';

describe('PatternAnalyzerService', () => {
  let service: PatternAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatternAnalyzerService],
    }).compile();

    service = module.get<PatternAnalyzerService>(PatternAnalyzerService);
  });

  describe('analyzeFieldDistribution', () => {
    it('should analyze numeric distribution', () => {
      const values = [10, 20, 30, 40, 50];
      const result = service.analyzeFieldDistribution(values);

      expect(result.min).toBe(10);
      expect(result.max).toBe(50);
      expect(result.mean).toBe(30);
      expect(result.count).toBe(5);
    });

    it('should return null for empty array', () => {
      const result = service.analyzeFieldDistribution([]);
      expect(result).toBeNull();
    });
  });

  describe('analyzeStringPatterns', () => {
    it('should analyze string patterns', () => {
      const values = ['hello', 'world', 'test', 'data'];
      const result = service.analyzeStringPatterns(values);

      expect(result.minLength).toBe(4);
      expect(result.maxLength).toBe(5);
      expect(result.samples).toContain('hello');
    });
  });

  describe('detectFieldRelationships', () => {
    it('should detect correlated fields', () => {
      const records = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
        { id: 3, name: null, email: null },
      ];
      const schema = {
        fields: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string' },
        ],
      };

      const relationships = service.detectFieldRelationships(records, schema);
      expect(relationships.size).toBeGreaterThan(0);
    });
  });
});
```

**Step 3: Commit**

```bash
git add backend/src/features/generation/services/pattern-analyzer.service*
git commit -m "feat: Add PatternAnalyzerService for analyzing field distributions and relationships"
```

---

### Task 7: Create Annotation Service

**Files:**
- Create: `backend/src/features/generation/services/annotation.service.ts`
- Create: `backend/src/features/generation/services/annotation.service.spec.ts`

**Step 1: Create AnnotationService**

```typescript
// backend/src/features/generation/services/annotation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnotationEntity } from '../../../shared/entities/annotation.entity';

@Injectable()
export class AnnotationService {
  constructor(
    @InjectRepository(AnnotationEntity)
    private annotationRepository: Repository<AnnotationEntity>,
  ) {}

  async addRecordAnnotation(
    recordId: string,
    type: string,
    value: string,
  ): Promise<AnnotationEntity> {
    const annotation = this.annotationRepository.create({
      targetType: 'record',
      targetId: recordId,
      annotationType: type,
      value,
    });
    return this.annotationRepository.save(annotation);
  }

  async addFieldAnnotation(
    fieldValueId: string,
    type: string,
    value: string,
  ): Promise<AnnotationEntity> {
    const annotation = this.annotationRepository.create({
      targetType: 'field',
      targetId: fieldValueId,
      annotationType: type,
      value,
    });
    return this.annotationRepository.save(annotation);
  }

  async getRecordAnnotations(recordId: string): Promise<AnnotationEntity[]> {
    return this.annotationRepository.find({
      where: {
        targetType: 'record',
        targetId: recordId,
      },
    });
  }

  async getFieldAnnotations(fieldValueId: string): Promise<AnnotationEntity[]> {
    return this.annotationRepository.find({
      where: {
        targetType: 'field',
        targetId: fieldValueId,
      },
    });
  }

  createSourceAnnotation(source: string, confidence: number): any {
    return {
      type: 'source',
      value: source,
      confidence,
    };
  }

  createConfidenceAnnotation(confidence: number): any {
    return {
      type: 'confidence',
      value: confidence.toString(),
    };
  }

  createTypeAnnotation(generationType: string): any {
    return {
      type: 'generation_type',
      value: generationType,
    };
  }
}
```

**Step 2: Create AnnotationService tests**

```typescript
// backend/src/features/generation/services/annotation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnnotationService } from './annotation.service';
import { AnnotationEntity } from '../../../shared/entities/annotation.entity';

describe('AnnotationService', () => {
  let service: AnnotationService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationService,
        {
          provide: getRepositoryToken(AnnotationEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AnnotationService>(AnnotationService);
  });

  it('should add record annotation', async () => {
    const annotation = {
      id: 'ann-1',
      targetType: 'record',
      targetId: 'rec-1',
      annotationType: 'source',
      value: 'rule-based',
      createdAt: new Date(),
    };

    mockRepository.create.mockReturnValue(annotation);
    mockRepository.save.mockResolvedValue(annotation);

    const result = await service.addRecordAnnotation('rec-1', 'source', 'rule-based');
    expect(result).toEqual(annotation);
  });

  it('should create source annotation', () => {
    const result = service.createSourceAnnotation('pattern', 0.95);
    expect(result.type).toBe('source');
    expect(result.confidence).toBe(0.95);
  });

  it('should create confidence annotation', () => {
    const result = service.createConfidenceAnnotation(0.85);
    expect(result.type).toBe('confidence');
    expect(result.value).toBe('0.85');
  });

  it('should get record annotations', async () => {
    const annotations = [
      { targetType: 'record', targetId: 'rec-1', annotationType: 'source' },
    ];
    mockRepository.find.mockResolvedValue(annotations);

    const result = await service.getRecordAnnotations('rec-1');
    expect(result).toEqual(annotations);
  });
});
```

**Step 3: Commit**

```bash
git add backend/src/features/generation/services/annotation.service*
git commit -m "feat: Add AnnotationService for metadata and lineage tracking"
```

---

### Task 8: Create Simple Data Generator

**Files:**
- Create: `backend/src/features/generation/services/simple-data-generator.service.ts`
- Create: `backend/src/features/generation/services/simple-data-generator.service.spec.ts`

**Step 1: Create SimpleDataGeneratorService**

```typescript
// backend/src/features/generation/services/simple-data-generator.service.ts
import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class SimpleDataGeneratorService {
  generateValue(
    field: any,
    rules?: any,
    distribution?: any,
  ): { value: any; source: string; confidence: number } {
    const fieldRule = rules && rules[field.name];

    // If there's a specific rule, use it
    if (fieldRule) {
      if (fieldRule.generate === 'sequential') {
        return { value: this.getSequentialValue(field), source: 'sequential_rule', confidence: 0.99 };
      }

      if (fieldRule.generate === 'from_pattern' && distribution) {
        return { value: this.generateFromPattern(field, distribution), source: 'pattern_rule', confidence: 0.95 };
      }

      if (fieldRule.value !== undefined) {
        return { value: fieldRule.value, source: 'fixed_rule', confidence: 1.0 };
      }

      if (fieldRule.distribution) {
        return {
          value: this.generateFromDistribution(field, fieldRule.distribution),
          source: 'distribution_rule',
          confidence: 0.9,
        };
      }
    }

    // Fall back to type-based generation
    return this.generateByType(field, distribution);
  }

  private getSequentialValue(field: any): any {
    // For MVP, just generate UUID
    return faker.string.uuid();
  }

  private generateFromPattern(field: any, distribution: any): any {
    if (field.type === 'email') {
      return faker.internet.email();
    }

    if (field.type === 'string' && distribution) {
      return faker.word.words({ count: 1 });
    }

    return '';
  }

  private generateFromDistribution(field: any, distribution: any): any {
    if (field.type === 'number') {
      const { mean, stddev } = distribution;
      if (mean !== undefined && stddev !== undefined) {
        return this.generateNormal(mean, stddev);
      }
      return faker.number.int({ min: 0, max: 100 });
    }

    return faker.datatype.boolean();
  }

  private generateByType(field: any, _distribution?: any): { value: any; source: string; confidence: number } {
    switch (field.type) {
      case 'string':
        return {
          value: faker.word.words({ count: 1 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'number':
        return {
          value: faker.number.int({ min: 0, max: 100 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'email':
        return {
          value: faker.internet.email(),
          source: 'type_based',
          confidence: 0.8,
        };
      case 'date':
        return {
          value: faker.date.past().toISOString(),
          source: 'type_based',
          confidence: 0.8,
        };
      case 'boolean':
        return {
          value: faker.datatype.boolean(),
          source: 'type_based',
          confidence: 0.9,
        };
      default:
        return {
          value: faker.word.words({ count: 1 }),
          source: 'default',
          confidence: 0.5,
        };
    }
  }

  private generateNormal(mean: number, stddev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(mean + stddev * z0);
  }

  generateRecord(
    schema: any,
    rules?: any,
    distributions?: any,
  ): { record: any; sources: any } {
    const record: any = {};
    const sources: any = {};

    schema.fields.forEach((field: any) => {
      const { value, source, confidence } = this.generateValue(
        field,
        rules,
        distributions && distributions[field.name],
      );

      record[field.name] = value;
      sources[field.name] = { source, confidence };
    });

    return { record, sources };
  }
}
```

**Step 2: Create SimpleDataGeneratorService tests**

```typescript
// backend/src/features/generation/services/simple-data-generator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SimpleDataGeneratorService } from './simple-data-generator.service';

describe('SimpleDataGeneratorService', () => {
  let service: SimpleDataGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimpleDataGeneratorService],
    }).compile();

    service = module.get<SimpleDataGeneratorService>(SimpleDataGeneratorService);
  });

  describe('generateValue', () => {
    it('should generate email with email type', () => {
      const field = { name: 'email', type: 'email' };
      const result = service.generateValue(field);

      expect(result.value).toContain('@');
      expect(result.source).toBeDefined();
    });

    it('should use fixed rule if provided', () => {
      const field = { name: 'status', type: 'string' };
      const rules = { status: { value: 'active' } };

      const result = service.generateValue(field, rules);
      expect(result.value).toBe('active');
      expect(result.confidence).toBe(1.0);
    });

    it('should generate number within range', () => {
      const field = { name: 'age', type: 'number' };
      const result = service.generateValue(field);

      expect(typeof result.value).toBe('number');
    });
  });

  describe('generateRecord', () => {
    it('should generate complete record', () => {
      const schema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'email', type: 'email' },
        ],
      };

      const { record, sources } = service.generateRecord(schema);

      expect(record.id).toBeDefined();
      expect(record.name).toBeDefined();
      expect(record.email).toContain('@');
      expect(sources.id).toBeDefined();
      expect(sources.email.source).toBeDefined();
    });

    it('should respect generation rules', () => {
      const schema = {
        fields: [
          { name: 'status', type: 'string' },
        ],
      };
      const rules = { status: { value: 'premium' } };

      const { record } = service.generateRecord(schema, rules);
      expect(record.status).toBe('premium');
    });
  });
});
```

**Step 3: Install faker dependency**

```bash
cd backend && npm install @faker-js/faker
```

**Step 4: Commit**

```bash
git add backend/src/features/generation/services/simple-data-generator.service*
git commit -m "feat: Add SimpleDataGeneratorService with type-based and rule-based generation"
```

---

### Task 9: Create Generation Service (Orchestrator)

**Files:**
- Create: `backend/src/features/generation/services/generation.service.ts`
- Create: `backend/src/features/generation/services/generation.service.spec.ts`

**Step 1: Create GenerationService**

```typescript
// backend/src/features/generation/services/generation.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { FieldValueEntity } from '../../../shared/entities/field-value.entity';
import { DatasetService } from '../../datasets/services/dataset.service';
import { ValidationService } from './validation.service';
import { PatternAnalyzerService } from './pattern-analyzer.service';
import { SimpleDataGeneratorService } from './simple-data-generator.service';
import { AnnotationService } from './annotation.service';
import { GenerateDto } from '../dto/generate.dto';

@Injectable()
export class GenerationService {
  constructor(
    @InjectRepository(GenerationJobEntity)
    private jobRepository: Repository<GenerationJobEntity>,
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(FieldValueEntity)
    private fieldValueRepository: Repository<FieldValueEntity>,
    private datasetService: DatasetService,
    private validationService: ValidationService,
    private patternAnalyzer: PatternAnalyzerService,
    private generator: SimpleDataGeneratorService,
    private annotationService: AnnotationService,
  ) {}

  async generate(projectId: string, generateDto: GenerateDto): Promise<GenerationJobEntity> {
    const { datasetId, count, rules } = generateDto;

    // Validate dataset exists
    const dataset = await this.datasetService.findOne(datasetId);

    // Validate schema
    this.validationService.validateSchema(dataset.schemaDefinition);

    // Validate rules
    if (rules) {
      this.validationService.validateRules(rules, dataset.schemaDefinition);
    }

    // Create generation job
    const job = this.jobRepository.create({
      projectId,
      datasetId,
      status: 'running',
      count,
      config: { rules },
    });
    await this.jobRepository.save(job);

    // Run generation asynchronously
    this.runGeneration(job, dataset.schemaDefinition, rules).catch((error) => {
      console.error('Generation failed:', error);
      job.status = 'failed';
      this.jobRepository.save(job);
    });

    return job;
  }

  private async runGeneration(
    job: GenerationJobEntity,
    schema: any,
    rules?: any,
  ): Promise<void> {
    try {
      for (let i = 0; i < job.count; i++) {
        const { record, sources } = this.generator.generateRecord(schema, rules);

        // Save record
        const recordEntity = this.recordRepository.create({
          projectId: job.projectId,
          generationJobId: job.id,
          data: record,
          isComposite: false,
        });
        const savedRecord = await this.recordRepository.save(recordEntity);

        // Save field values with annotations
        for (const fieldName of Object.keys(record)) {
          const fieldValue = this.fieldValueRepository.create({
            recordId: savedRecord.id,
            fieldName,
            value: record[fieldName],
            dataType: schema.fields.find((f: any) => f.name === fieldName)?.type || 'string',
          });
          const savedFieldValue = await this.fieldValueRepository.save(fieldValue);

          // Add field annotation
          const { source, confidence } = sources[fieldName];
          await this.annotationService.addFieldAnnotation(
            savedFieldValue.id,
            'source',
            source,
          );
          await this.annotationService.addFieldAnnotation(
            savedFieldValue.id,
            'confidence',
            confidence.toString(),
          );
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<GenerationJobEntity> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return job;
  }

  async getJobs(projectId: string): Promise<GenerationJobEntity[]> {
    return this.jobRepository.find({ where: { projectId } });
  }

  async getRecords(jobId: string, skip: number = 0, take: number = 10): Promise<RecordEntity[]> {
    return this.recordRepository.find({
      where: { generationJobId: jobId },
      relations: ['fieldValues'],
      skip,
      take,
    });
  }

  async getRecord(recordId: string): Promise<RecordEntity> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
      relations: ['fieldValues'],
    });
    if (!record) {
      throw new NotFoundException(`Record ${recordId} not found`);
    }
    return record;
  }
}
```

**Step 2: Create GenerationService tests**

```typescript
// backend/src/features/generation/services/generation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GenerationService } from './generation.service';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { FieldValueEntity } from '../../../shared/entities/field-value.entity';
import { DatasetService } from '../../datasets/services/dataset.service';
import { ValidationService } from './validation.service';
import { PatternAnalyzerService } from './pattern-analyzer.service';
import { SimpleDataGeneratorService } from './simple-data-generator.service';
import { AnnotationService } from './annotation.service';

describe('GenerationService', () => {
  let service: GenerationService;
  let mockJobRepository: any;
  let mockRecordRepository: any;
  let mockFieldValueRepository: any;

  beforeEach(async () => {
    mockJobRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockRecordRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockFieldValueRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: getRepositoryToken(GenerationJobEntity),
          useValue: mockJobRepository,
        },
        {
          provide: getRepositoryToken(RecordEntity),
          useValue: mockRecordRepository,
        },
        {
          provide: getRepositoryToken(FieldValueEntity),
          useValue: mockFieldValueRepository,
        },
        {
          provide: DatasetService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        ValidationService,
        PatternAnalyzerService,
        SimpleDataGeneratorService,
        {
          provide: AnnotationService,
          useValue: {
            addFieldAnnotation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  it('should create a generation job', async () => {
    const job = {
      id: 'job-1',
      projectId: 'proj-1',
      datasetId: 'dataset-1',
      status: 'running',
      count: 100,
      config: {},
      createdAt: new Date(),
    };

    mockJobRepository.create.mockReturnValue(job);
    mockJobRepository.save.mockResolvedValue(job);

    const datasetService = module.get(DatasetService);
    datasetService.findOne.mockResolvedValue({
      id: 'dataset-1',
      schemaDefinition: {
        fields: [{ name: 'id', type: 'string' }],
      },
    });

    const result = await service.generate('proj-1', {
      datasetId: 'dataset-1',
      count: 100,
    });

    expect(result.status).toBe('running');
  });

  it('should get job by id', async () => {
    const job = { id: 'job-1', status: 'completed' };
    mockJobRepository.findOne.mockResolvedValue(job);

    const result = await service.getJob('job-1');
    expect(result).toEqual(job);
  });

  it('should get records for job', async () => {
    const records = [{ id: 'rec-1', generationJobId: 'job-1' }];
    mockRecordRepository.find.mockResolvedValue(records);

    const result = await service.getRecords('job-1');
    expect(result).toEqual(records);
  });
});
```

**Step 3: Commit**

```bash
git add backend/src/features/generation/services/generation.service*
git commit -m "feat: Add GenerationService orchestrating record generation and storage"
```

---

### Task 10: Create Generation Controller & Endpoints

**Files:**
- Create: `backend/src/features/generation/controllers/generation.controller.ts`

**Step 1: Create GenerationController**

```typescript
// backend/src/features/generation/controllers/generation.controller.ts
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GenerationService } from '../services/generation.service';
import { GenerateDto } from '../dto/generate.dto';

@ApiTags('Generation')
@Controller('projects/:projectId')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Trigger synthetic data generation' })
  generate(@Param('projectId') projectId: string, @Body() generateDto: GenerateDto) {
    return this.generationService.generate(projectId, generateDto);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get generation job status' })
  getJob(@Param('jobId') jobId: string) {
    return this.generationService.getJob(jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all generation jobs for a project' })
  getJobs(@Param('projectId') projectId: string) {
    return this.generationService.getJobs(projectId);
  }

  @Get('records')
  @ApiOperation({ summary: 'Get generated records' })
  getRecords(
    @Param('projectId') projectId: string,
    @Query('jobId') jobId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.generationService.getRecords(jobId, skip, take);
  }

  @Get('records/:recordId')
  @ApiOperation({ summary: 'Get a specific generated record' })
  getRecord(@Param('recordId') recordId: string) {
    return this.generationService.getRecord(recordId);
  }
}
```

**Step 2: Update AppModule to include GenerationService**

Add to AppModule imports and providers the GenerationService and GenerationController.

**Step 3: Commit**

```bash
git add backend/src/features/generation/controllers/generation.controller.ts
git commit -m "feat: Add GenerationController for generation job management and record access"
```

---

## REMAINING PHASES OUTLINE

Due to length constraints, here's the structure for Phases 3-5:

### PHASE 3: COMPOSITE GENERATION (ELEMENT COMPOSITION)
- Task 11: Create CompositeDataGenerator service
- Task 12: Implement element selection and composition logic
- Task 13: Add transition type handling (gradual/abrupt)
- Task 14: Create composition validation

### PHASE 4: FRONTEND IMPLEMENTATION
- Task 15: Create project management pages (list, create, detail)
- Task 16: Create dataset builder with schema editor
- Task 17: Create element manager
- Task 18: Create generation configuration and monitoring
- Task 19: Create results explorer and record viewer
- Task 20: Create export interface

### PHASE 5: TESTING & POLISH
- Task 21: Comprehensive integration tests
- Task 22: E2E workflow testing
- Task 23: Performance optimization
- Task 24: Error handling enhancements
- Task 25: Documentation and deployment guide

---

## Implementation Checklist

**Phase 1: Foundation**
- [ ] Database schema and entities
- [ ] DTOs for all endpoints
- [ ] ProjectService and tests
- [ ] DatasetService and tests
- [ ] ProjectController and DatasetController

**Phase 2: Simple Generation**
- [ ] ValidationService
- [ ] PatternAnalyzerService
- [ ] AnnotationService
- [ ] SimpleDataGeneratorService
- [ ] GenerationService (orchestrator)
- [ ] GenerationController
- [ ] Generate 1000 records in <5s

**Phase 3: Composite Generation**
- [ ] CompositeDataGeneratorService
- [ ] Element composition logic
- [ ] Transition handling
- [ ] ElementInstance tracking

**Phase 4: Frontend**
- [ ] All UI components
- [ ] Services for API integration
- [ ] Route configuration
- [ ] Form builders and validation

**Phase 5: Testing & Polish**
- [ ] Integration test suite
- [ ] E2E tests
- [ ] Performance benchmarks
- [ ] Deployment documentation

---

## Commit Strategy

- Commit after each completed task
- Use descriptive commit messages with `feat:`, `test:`, `fix:` prefixes
- Reference task number in commit: `Task X: [description]`
- Push to feature branch before merging to main

---

## Dependencies & Versions

```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/typeorm": "^11.0.0",
  "typeorm": "^0.3.27",
  "@faker-js/faker": "^8.3.1",
  "class-validator": "^0.14.2"
}
```

---

## Success Criteria for MVP

✅ Users can create projects and datasets
✅ System can generate 1000 simple records in <5s
✅ All records include annotations (source, confidence)
✅ Export works for JSON format
✅ Element composition works with transitions
✅ Architecture supports future LLM integration
✅ >80% test coverage on core services
✅ Comprehensive error handling
