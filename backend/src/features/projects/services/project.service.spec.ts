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
