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
      name: createDatasetDto.name,
      schemaDefinition: createDatasetDto.schema,
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
