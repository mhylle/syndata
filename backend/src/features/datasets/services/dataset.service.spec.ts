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
