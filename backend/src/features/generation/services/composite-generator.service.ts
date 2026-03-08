import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ElementEntity } from '../../../shared/entities/element.entity';
import { ElementInstanceEntity } from '../../../shared/entities/element-instance.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { SimpleDataGeneratorService } from './simple-data-generator.service';

export interface CompositionConfig {
  elementIds?: string[];
  selectionStrategy: 'random' | 'weighted' | 'sequential';
  transitionType: 'gradual' | 'abrupt' | 'blended' | 'probabilistic' | 'conditional';
  transitionConfig?: {
    steps?: number;           // For gradual: how many interpolation steps
    blendWeight?: number;     // For blended: 0-1 weight towards next element
    probability?: number;     // For probabilistic: chance of applying transition per field
    condition?: {             // For conditional: field-based condition
      field: string;
      operator: 'eq' | 'gt' | 'lt';
      value: any;
    };
  };
  maxElements?: number;
}

@Injectable()
export class CompositeGeneratorService {
  private readonly logger = new Logger(CompositeGeneratorService.name);

  constructor(
    @InjectRepository(ElementEntity)
    private elementRepository: Repository<ElementEntity>,
    @InjectRepository(ElementInstanceEntity)
    private elementInstanceRepository: Repository<ElementInstanceEntity>,
    private generator: SimpleDataGeneratorService,
  ) {}

  async generateCompositeRecord(
    datasetId: string,
    config: CompositionConfig,
    schema: any,
  ): Promise<{ record: RecordEntity; instances: ElementInstanceEntity[] }> {
    // 1. Select elements
    const elements = await this.selectElements(datasetId, config);
    if (elements.length === 0) {
      throw new BadRequestException('No elements available for composition');
    }

    // 2. Generate data for each element
    const elementOutputs: { element: ElementEntity; data: Record<string, any> }[] = [];
    for (const element of elements) {
      const { record: data } = await this.generator.generateRecord(
        element.definition.schema || schema,
        element.definition.rules,
      );
      elementOutputs.push({ element, data });
    }

    // 3. Apply transitions between adjacent elements
    const composedParts: any[] = [];
    for (let i = 0; i < elementOutputs.length; i++) {
      composedParts.push(elementOutputs[i].data);

      if (i < elementOutputs.length - 1) {
        const transitionData = this.applyTransition(
          elementOutputs[i].data,
          elementOutputs[i + 1].data,
          config.transitionType,
          config.transitionConfig,
        );
        if (transitionData) {
          composedParts.push(transitionData);
        }
      }
    }

    // 4. Build composite record
    const record = new RecordEntity();
    record.data = {
      parts: composedParts,
      elementCount: elements.length,
      transitionType: config.transitionType,
    };
    record.isComposite = true;
    record.createdAt = new Date();

    // 5. Create element instance records
    const instances: ElementInstanceEntity[] = elements.map((element, idx) => {
      const instance = new ElementInstanceEntity();
      instance.elementId = element.id;
      instance.position = idx;
      instance.transitionType = idx < elements.length - 1 ? config.transitionType : 'none';
      return instance;
    });

    return { record, instances };
  }

  private async selectElements(
    datasetId: string,
    config: CompositionConfig,
  ): Promise<ElementEntity[]> {
    if (config.elementIds?.length) {
      return this.elementRepository.find({
        where: { id: In(config.elementIds), datasetId },
      });
    }

    const allElements = await this.elementRepository.find({ where: { datasetId } });
    const maxElements = config.maxElements || Math.min(allElements.length, 5);

    switch (config.selectionStrategy) {
      case 'sequential':
        return allElements.slice(0, maxElements);
      case 'random':
      default:
        return this.shuffleAndTake(allElements, maxElements);
    }
  }

  applyTransition(
    prevData: Record<string, any>,
    nextData: Record<string, any>,
    transitionType: string,
    config?: CompositionConfig['transitionConfig'],
  ): Record<string, any> | null {
    switch (transitionType) {
      case 'abrupt':
        return null; // No transition data -- hard cut

      case 'gradual': {
        // Interpolate numeric fields over a midpoint
        const result: Record<string, any> = {};
        const allKeys = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
        for (const key of allKeys) {
          const prev = prevData[key];
          const next = nextData[key];
          if (typeof prev === 'number' && typeof next === 'number') {
            result[key] = (prev + next) / 2;
          } else {
            result[key] = Math.random() > 0.5 ? next : prev;
          }
        }
        result._transition = 'gradual';
        return result;
      }

      case 'blended': {
        const weight = config?.blendWeight ?? 0.5;
        const result: Record<string, any> = {};
        const allKeys = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
        for (const key of allKeys) {
          const prev = prevData[key];
          const next = nextData[key];
          if (typeof prev === 'number' && typeof next === 'number') {
            result[key] = prev * (1 - weight) + next * weight;
          } else {
            result[key] = Math.random() > weight ? prev : next;
          }
        }
        result._transition = 'blended';
        return result;
      }

      case 'probabilistic': {
        const prob = config?.probability ?? 0.5;
        const result: Record<string, any> = {};
        const allKeys = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
        for (const key of allKeys) {
          if (Math.random() < prob) {
            result[key] = nextData[key] ?? prevData[key];
          } else {
            result[key] = prevData[key] ?? nextData[key];
          }
        }
        result._transition = 'probabilistic';
        return result;
      }

      case 'conditional': {
        if (!config?.condition) return null;
        const { field, operator, value } = config.condition;
        const prevVal = prevData[field];
        let useNext = false;
        if (operator === 'eq') useNext = prevVal === value;
        else if (operator === 'gt') useNext = prevVal > value;
        else if (operator === 'lt') useNext = prevVal < value;

        return useNext ? { ...nextData, _transition: 'conditional' } : null;
      }

      default:
        return null;
    }
  }

  private shuffleAndTake<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  }
}
