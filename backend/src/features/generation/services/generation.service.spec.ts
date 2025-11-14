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
  let mockDatasetService: any;
  let module: TestingModule;

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

    mockDatasetService = {
      findOne: jest.fn(),
    };

    module = await Test.createTestingModule({
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
          useValue: mockDatasetService,
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
      count: 1,
      config: {},
      createdAt: new Date(),
    };

    mockJobRepository.create.mockReturnValue(job);
    mockJobRepository.save.mockResolvedValue(job);
    mockRecordRepository.create.mockReturnValue({ id: 'rec-1' });
    mockRecordRepository.save.mockResolvedValue({ id: 'rec-1' });
    mockFieldValueRepository.create.mockReturnValue({ id: 'fv-1' });
    mockFieldValueRepository.save.mockResolvedValue({ id: 'fv-1' });

    mockDatasetService.findOne.mockResolvedValue({
      id: 'dataset-1',
      schemaDefinition: {
        fields: [{ name: 'id', type: 'string' }],
      },
    });

    const result = await service.generate('proj-1', {
      datasetId: 'dataset-1',
      count: 1,
    });

    expect(result.status).toBe('running');
    expect(mockJobRepository.create).toHaveBeenCalled();
    expect(mockJobRepository.save).toHaveBeenCalled();
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
