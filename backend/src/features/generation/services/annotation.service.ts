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
