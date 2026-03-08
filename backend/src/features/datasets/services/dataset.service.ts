// backend/src/features/datasets/services/dataset.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatasetEntity } from '../../../shared/entities/dataset.entity';
import { ElementEntity } from '../../../shared/entities/element.entity';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { FieldValueEntity } from '../../../shared/entities/field-value.entity';
import { CreateDatasetDto, CreateElementDto, UpdateDatasetDto } from '../dto';

@Injectable()
export class DatasetService {
  private readonly logger = new Logger(DatasetService.name);

  constructor(
    @InjectRepository(DatasetEntity)
    private datasetRepository: Repository<DatasetEntity>,
    @InjectRepository(ElementEntity)
    private elementRepository: Repository<ElementEntity>,
    @InjectRepository(GenerationJobEntity)
    private jobRepository: Repository<GenerationJobEntity>,
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(FieldValueEntity)
    private fieldValueRepository: Repository<FieldValueEntity>,
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

  async update(id: string, updateDatasetDto: UpdateDatasetDto): Promise<DatasetEntity> {
    const dataset = await this.findOne(id);
    if (updateDatasetDto.name !== undefined) {
      dataset.name = updateDatasetDto.name;
    }
    if (updateDatasetDto.schemaDefinition !== undefined) {
      dataset.schemaDefinition = updateDatasetDto.schemaDefinition;
    }
    return this.datasetRepository.save(dataset);
  }

  async delete(id: string): Promise<void> {
    const dataset = await this.findOne(id);

    // Delete related records: field_values → records → jobs → elements → dataset
    const jobs = await this.jobRepository.find({ where: { datasetId: id } });
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.id);
      // Find records for these jobs to delete their field values
      const records = await this.recordRepository
        .createQueryBuilder('r')
        .select('r.id')
        .where('r.generationJobId IN (:...jobIds)', { jobIds })
        .getMany();

      if (records.length > 0) {
        const recordIds = records.map(r => r.id);
        await this.fieldValueRepository
          .createQueryBuilder()
          .delete()
          .where('recordId IN (:...recordIds)', { recordIds })
          .execute();
      }

      await this.recordRepository
        .createQueryBuilder()
        .delete()
        .where('generationJobId IN (:...jobIds)', { jobIds })
        .execute();

      await this.jobRepository.delete(jobIds);
    }

    await this.elementRepository.delete({ datasetId: id });
    await this.datasetRepository.delete(id);

    this.logger.log(`Deleted dataset ${id} and related data`);
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
