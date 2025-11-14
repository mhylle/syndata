// backend/src/features/generation/services/generation.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { FieldValueEntity } from '../../../shared/entities/field-value.entity';
import { DatasetService } from '../../datasets/services/dataset.service';
import { ValidationService } from './validation.service';
import { PatternAnalyzerService } from './pattern-analyzer.service';
import { SimpleDataGeneratorService } from './simple-data-generator.service';
import { AnnotationService } from './annotation.service';
import { GenerateDto } from '../dto/generate.dto';

@Injectable()
export class GenerationService {
  constructor(
    @InjectRepository(GenerationJobEntity)
    private jobRepository: Repository<GenerationJobEntity>,
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(FieldValueEntity)
    private fieldValueRepository: Repository<FieldValueEntity>,
    private datasetService: DatasetService,
    private validationService: ValidationService,
    private patternAnalyzer: PatternAnalyzerService,
    private generator: SimpleDataGeneratorService,
    private annotationService: AnnotationService,
  ) {}

  async generate(projectId: string, generateDto: GenerateDto): Promise<GenerationJobEntity> {
    const { datasetId, count, rules } = generateDto;

    // Validate dataset exists
    const dataset = await this.datasetService.findOne(datasetId);

    // Validate schema
    this.validationService.validateSchema(dataset.schemaDefinition);

    // Validate rules
    if (rules) {
      this.validationService.validateRules(rules, dataset.schemaDefinition);
    }

    // Create generation job
    const job = this.jobRepository.create({
      projectId,
      datasetId,
      status: 'running',
      count,
      config: { rules },
    });
    await this.jobRepository.save(job);

    // Run generation asynchronously
    this.runGeneration(job, dataset.schemaDefinition, rules).catch((error) => {
      console.error('Generation failed:', error);
      job.status = 'failed';
      this.jobRepository.save(job);
    });

    return job;
  }

  private async runGeneration(
    job: GenerationJobEntity,
    schema: any,
    rules?: any,
  ): Promise<void> {
    try {
      for (let i = 0; i < job.count; i++) {
        const { record, sources } = this.generator.generateRecord(schema, rules);

        // Save record
        const recordEntity = this.recordRepository.create({
          projectId: job.projectId,
          generationJobId: job.id,
          data: record,
          isComposite: false,
        });
        const savedRecord = await this.recordRepository.save(recordEntity);

        // Save field values with annotations
        for (const fieldName of Object.keys(record)) {
          const fieldValue = this.fieldValueRepository.create({
            recordId: savedRecord.id,
            fieldName,
            value: record[fieldName],
            dataType: schema.fields.find((f: any) => f.name === fieldName)?.type || 'string',
          });
          const savedFieldValue = await this.fieldValueRepository.save(fieldValue);

          // Add field annotation
          const { source, confidence } = sources[fieldName];
          await this.annotationService.addFieldAnnotation(
            savedFieldValue.id,
            'source',
            source,
          );
          await this.annotationService.addFieldAnnotation(
            savedFieldValue.id,
            'confidence',
            confidence.toString(),
          );
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      await this.jobRepository.save(job);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<GenerationJobEntity> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return job;
  }

  async getJobs(projectId: string): Promise<GenerationJobEntity[]> {
    return this.jobRepository.find({ where: { projectId } });
  }

  async getRecords(jobId: string, skip: number = 0, take: number = 10): Promise<RecordEntity[]> {
    return this.recordRepository.find({
      where: { generationJobId: jobId },
      relations: ['fieldValues'],
      skip,
      take,
    });
  }

  async getRecord(recordId: string): Promise<RecordEntity> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
      relations: ['fieldValues'],
    });
    if (!record) {
      throw new NotFoundException(`Record ${recordId} not found`);
    }
    return record;
  }
}
