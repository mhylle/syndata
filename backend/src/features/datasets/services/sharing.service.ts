import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedResourceEntity } from '../../../shared/entities/shared-resource.entity';
import { DatasetEntity } from '../../../shared/entities/dataset.entity';
import { ElementEntity } from '../../../shared/entities/element.entity';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(SharedResourceEntity)
    private sharedRepository: Repository<SharedResourceEntity>,
    @InjectRepository(DatasetEntity)
    private datasetRepository: Repository<DatasetEntity>,
    @InjectRepository(ElementEntity)
    private elementRepository: Repository<ElementEntity>,
  ) {}

  async shareResource(
    resourceType: 'dataset' | 'element',
    resourceId: string,
    sourceProjectId: string,
    visibility: 'private' | 'public' = 'public',
    sharedBy?: string,
  ): Promise<SharedResourceEntity> {
    // Verify resource exists
    if (resourceType === 'dataset') {
      const dataset = await this.datasetRepository.findOne({ where: { id: resourceId } });
      if (!dataset) throw new NotFoundException(`Dataset ${resourceId} not found`);
    } else {
      const element = await this.elementRepository.findOne({ where: { id: resourceId } });
      if (!element) throw new NotFoundException(`Element ${resourceId} not found`);
    }

    // Check if already shared
    const existing = await this.sharedRepository.findOne({
      where: { resourceType, resourceId },
    });
    if (existing) {
      throw new BadRequestException('Resource is already shared');
    }

    const shared = this.sharedRepository.create({
      resourceType,
      resourceId,
      sourceProjectId,
      visibility,
      sharedBy,
    });

    return this.sharedRepository.save(shared);
  }

  async listSharedResources(
    type?: 'dataset' | 'element',
    projectId?: string,
  ): Promise<any[]> {
    const where: any = { visibility: 'public' };
    if (type) where.resourceType = type;
    if (projectId) where.sourceProjectId = projectId;

    const shared = await this.sharedRepository.find({ where, order: { createdAt: 'DESC' } });

    // Enrich with resource details
    const enriched: any[] = [];
    for (const item of shared) {
      let resourceData: any = null;
      if (item.resourceType === 'dataset') {
        resourceData = await this.datasetRepository.findOne({ where: { id: item.resourceId } });
      } else {
        resourceData = await this.elementRepository.findOne({ where: { id: item.resourceId } });
      }

      enriched.push({
        ...item,
        resource: resourceData ? { name: resourceData.name, type: resourceData.type } : null,
      });
    }

    return enriched;
  }

  async importSharedDataset(
    sharedResourceId: string,
    targetProjectId: string,
  ): Promise<DatasetEntity> {
    const shared = await this.sharedRepository.findOne({
      where: { id: sharedResourceId, resourceType: 'dataset' },
    });
    if (!shared) throw new NotFoundException(`Shared resource ${sharedResourceId} not found`);

    const original = await this.datasetRepository.findOne({
      where: { id: shared.resourceId },
    });
    if (!original) throw new NotFoundException('Original dataset no longer exists');

    // Create a copy in the target project
    const copy = this.datasetRepository.create({
      projectId: targetProjectId,
      name: `${original.name} (imported)`,
      schemaDefinition: original.schemaDefinition,
    });

    return this.datasetRepository.save(copy);
  }

  async importSharedElement(
    sharedResourceId: string,
    targetDatasetId: string,
  ): Promise<ElementEntity> {
    const shared = await this.sharedRepository.findOne({
      where: { id: sharedResourceId, resourceType: 'element' },
    });
    if (!shared) throw new NotFoundException(`Shared resource ${sharedResourceId} not found`);

    const original = await this.elementRepository.findOne({
      where: { id: shared.resourceId },
    });
    if (!original) throw new NotFoundException('Original element no longer exists');

    const copy = this.elementRepository.create({
      datasetId: targetDatasetId,
      name: `${original.name} (imported)`,
      type: original.type,
      definition: original.definition,
    });

    return this.elementRepository.save(copy);
  }

  async unshare(sharedResourceId: string): Promise<void> {
    const result = await this.sharedRepository.delete(sharedResourceId);
    if (result.affected === 0) {
      throw new NotFoundException(`Shared resource ${sharedResourceId} not found`);
    }
  }
}
