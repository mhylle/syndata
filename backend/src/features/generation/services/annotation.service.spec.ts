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
