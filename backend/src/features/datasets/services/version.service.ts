import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatasetVersionEntity } from '../../../shared/entities/dataset-version.entity';
import { ElementVersionEntity } from '../../../shared/entities/element-version.entity';
import { DatasetEntity } from '../../../shared/entities/dataset.entity';
import { ElementEntity } from '../../../shared/entities/element.entity';

@Injectable()
export class VersionService {
  constructor(
    @InjectRepository(DatasetVersionEntity)
    private datasetVersionRepository: Repository<DatasetVersionEntity>,
    @InjectRepository(ElementVersionEntity)
    private elementVersionRepository: Repository<ElementVersionEntity>,
    @InjectRepository(DatasetEntity)
    private datasetRepository: Repository<DatasetEntity>,
    @InjectRepository(ElementEntity)
    private elementRepository: Repository<ElementEntity>,
  ) {}

  // Dataset versioning

  async createDatasetVersion(
    datasetId: string,
    changeDescription?: string,
  ): Promise<DatasetVersionEntity> {
    const dataset = await this.datasetRepository.findOne({ where: { id: datasetId } });
    if (!dataset) throw new NotFoundException(`Dataset ${datasetId} not found`);

    const latestVersion = await this.datasetVersionRepository.findOne({
      where: { datasetId },
      order: { version: 'DESC' },
    });

    const version = this.datasetVersionRepository.create({
      datasetId,
      version: (latestVersion?.version || 0) + 1,
      schemaDefinition: dataset.schemaDefinition,
      changeDescription,
    });

    return this.datasetVersionRepository.save(version);
  }

  async listDatasetVersions(datasetId: string): Promise<DatasetVersionEntity[]> {
    return this.datasetVersionRepository.find({
      where: { datasetId },
      order: { version: 'DESC' },
    });
  }

  async getDatasetVersion(datasetId: string, version: number): Promise<DatasetVersionEntity> {
    const v = await this.datasetVersionRepository.findOne({
      where: { datasetId, version },
    });
    if (!v) throw new NotFoundException(`Version ${version} not found for dataset ${datasetId}`);
    return v;
  }

  async rollbackDatasetToVersion(datasetId: string, version: number): Promise<DatasetEntity> {
    const v = await this.getDatasetVersion(datasetId, version);
    const dataset = await this.datasetRepository.findOne({ where: { id: datasetId } });
    if (!dataset) throw new NotFoundException(`Dataset ${datasetId} not found`);

    // Create a version snapshot of current state before rollback
    await this.createDatasetVersion(datasetId, `Before rollback to v${version}`);

    // Restore the old schema
    dataset.schemaDefinition = v.schemaDefinition;
    return this.datasetRepository.save(dataset);
  }

  // Element versioning

  async createElementVersion(
    elementId: string,
    changeDescription?: string,
  ): Promise<ElementVersionEntity> {
    const element = await this.elementRepository.findOne({ where: { id: elementId } });
    if (!element) throw new NotFoundException(`Element ${elementId} not found`);

    const latestVersion = await this.elementVersionRepository.findOne({
      where: { elementId },
      order: { version: 'DESC' },
    });

    const version = this.elementVersionRepository.create({
      elementId,
      version: (latestVersion?.version || 0) + 1,
      definition: element.definition,
      changeDescription,
    });

    return this.elementVersionRepository.save(version);
  }

  async listElementVersions(elementId: string): Promise<ElementVersionEntity[]> {
    return this.elementVersionRepository.find({
      where: { elementId },
      order: { version: 'DESC' },
    });
  }

  async getElementVersion(elementId: string, version: number): Promise<ElementVersionEntity> {
    const v = await this.elementVersionRepository.findOne({
      where: { elementId, version },
    });
    if (!v) throw new NotFoundException(`Version ${version} not found for element ${elementId}`);
    return v;
  }
}
