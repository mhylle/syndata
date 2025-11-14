// backend/src/features/generation/services/generation.service.ts
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { FieldValueEntity } from '../../../shared/entities/field-value.entity';
import { SyntheticSchemaEntity } from '../../../shared/entities/synthetic-schema.entity';
import { DatasetService } from '../../datasets/services/dataset.service';
import { ValidationService } from './validation.service';
import { PatternAnalyzerService } from './pattern-analyzer.service';
import { SimpleDataGeneratorService } from './simple-data-generator.service';
import { AnnotationService } from './annotation.service';
import { OllamaService } from './ollama.service';
import { GenerateDto } from '../dto/generate.dto';
import { faker } from '@faker-js/faker';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    @InjectRepository(GenerationJobEntity)
    private jobRepository: Repository<GenerationJobEntity>,
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(FieldValueEntity)
    private fieldValueRepository: Repository<FieldValueEntity>,
    @InjectRepository(SyntheticSchemaEntity)
    private schemaRepository: Repository<SyntheticSchemaEntity>,
    private datasetService: DatasetService,
    private validationService: ValidationService,
    private patternAnalyzer: PatternAnalyzerService,
    private generator: SimpleDataGeneratorService,
    private annotationService: AnnotationService,
    private ollamaService: OllamaService,
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

  /**
   * Generate records from a SyntheticSchema (AI-generated schema)
   * @param projectId Project ID
   * @param datasetId Dataset ID
   * @param schemaId SyntheticSchema ID
   * @param count Number of records to generate
   * @param generationFilters Confidence filters for components, rules, and fields
   * @returns Array of generated RecordEntity objects
   */
  async generateRecordsFromSchema(
    projectId: string,
    datasetId: string,
    schemaId: string,
    count: number,
    generationFilters?: {
      minComponentConfidence?: number;
      minRuleConfidence?: number;
      minFieldConfidence?: number;
    },
  ): Promise<RecordEntity[]> {
    this.logger.log(`[${projectId}] Generating ${count} records from schema ${schemaId}`);

    // 1. Retrieve SyntheticSchema by ID
    const schema = await this.schemaRepository.findOne({
      where: { id: schemaId },
    });

    if (!schema) {
      throw new NotFoundException(`Schema ${schemaId} not found`);
    }

    this.logger.log(`[${projectId}] Using schema: ${schema.schemaMetadata.name}`);

    const records: RecordEntity[] = [];

    // 2. Generate count records
    for (let i = 0; i < count; i++) {
      try {
        const record = await this.generateRecordFromDynamicSchema(
          schema.rootStructure,
          schema.generationRules || [],
          generationFilters,
        );

        record.projectId = projectId;
        // Note: generationJobId will be set by caller if needed
        records.push(record);
      } catch (error) {
        this.logger.error(`[${projectId}] Failed to generate record ${i + 1}: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`[${projectId}] Successfully generated ${records.length} records`);
    return records;
  }

  /**
   * Generate a single record from dynamic schema structure
   * @param rootStructure Schema root structure with components
   * @param generationRules Array of generation rules
   * @param generationFilters Confidence filters
   * @returns RecordEntity with populated data
   */
  private async generateRecordFromDynamicSchema(
    rootStructure: any,
    generationRules: any[],
    generationFilters?: any,
  ): Promise<RecordEntity> {
    const data: Record<string, any> = {};
    const filters = {
      minComponent: generationFilters?.minComponentConfidence ?? 0.6,
      minRule: generationFilters?.minRuleConfidence ?? 0.5,
      minField: generationFilters?.minFieldConfidence ?? 0.4,
    };

    // Process each component in the schema
    for (const component of rootStructure.components || []) {
      // Skip low-confidence components
      if (component.confidence < filters.minComponent) {
        this.logger.debug(
          `Skipping component ${component.id} (confidence: ${component.confidence} < ${filters.minComponent})`,
        );
        continue;
      }

      const componentData: Record<string, any> = {};

      // Process each field in component
      for (const [fieldName, field] of Object.entries(component.fields || {})) {
        const fieldTyped = field as any;

        // Skip low-confidence fields
        if (fieldTyped.confidence < filters.minField) {
          this.logger.debug(
            `Skipping field ${fieldName} (confidence: ${fieldTyped.confidence} < ${filters.minField})`,
          );
          continue;
        }

        // Find applicable generation rules for this field
        const applicableRules = (component.metadata?.generationRules || [])
          .filter(
            (rule: any) =>
              rule.outputs.includes(fieldName) &&
              rule.confidence >= filters.minRule,
          )
          .sort((a: any, b: any) => b.priority - a.priority); // Sort by priority (highest first)

        // Probabilistic rule execution
        let fieldValue = null;
        for (const rule of applicableRules) {
          const random = Math.random();
          // Execute rule based on confidence (e.g., 0.9 confidence = 90% chance of execution)
          if (random <= rule.confidence) {
            try {
              fieldValue = await this.executeGenerationRule(rule, componentData);
              if (fieldValue !== null) {
                break; // Stop at first successful rule execution
              }
            } catch (error) {
              this.logger.warn(
                `Rule ${rule.ruleId} failed for field ${fieldName}: ${error.message}`,
              );
              // Continue to next rule
            }
          }
        }

        // Store generated value
        if (fieldValue !== null) {
          componentData[fieldName] = fieldValue;
        }
      }

      // Store component data (use component ID as key)
      data[component.componentType] = componentData;
    }

    // Create record entity with generated data
    const record = new RecordEntity();
    record.data = data;
    record.isComposite = rootStructure.components?.length > 1;
    record.createdAt = new Date();

    return record;
  }

  /**
   * Execute a generation rule based on its type
   * @param rule Generation rule
   * @param context Current component data (for dependent fields)
   * @returns Generated value or null
   */
  private async executeGenerationRule(rule: any, context: Record<string, any>): Promise<any> {
    switch (rule.ruleType) {
      case 'deterministic':
        return this.executeDeterministicRule(rule);
      case 'statistical':
        return this.executeStatisticalRule(rule);
      case 'llm_prompt':
        return await this.executeLLMRule(rule, context);
      default:
        this.logger.warn(`Unknown rule type: ${rule.ruleType}`);
        return null;
    }
  }

  /**
   * Execute a deterministic generation rule (calls existing generators)
   * @param rule Deterministic rule with generator name and parameters
   * @returns Generated value
   */
  private executeDeterministicRule(rule: any): any {
    const generator = rule.generatorName;
    const params = rule.parameters || {};

    // Map to existing faker generators
    if (generator === 'faker_email') {
      return faker.internet.email();
    }
    if (generator === 'faker_name') {
      return faker.person.fullName();
    }
    if (generator === 'faker_firstName') {
      return faker.person.firstName();
    }
    if (generator === 'faker_lastName') {
      return faker.person.lastName();
    }
    if (generator === 'faker_phone') {
      return faker.phone.number();
    }
    if (generator === 'faker_address') {
      return faker.location.streetAddress();
    }
    if (generator === 'faker_city') {
      return faker.location.city();
    }
    if (generator === 'faker_country') {
      return faker.location.country();
    }
    if (generator === 'faker_company') {
      return faker.company.name();
    }
    if (generator === 'faker_uuid') {
      return faker.string.uuid();
    }
    if (generator === 'faker_date') {
      return faker.date.past().toISOString();
    }
    if (generator === 'faker_boolean') {
      return faker.datatype.boolean();
    }
    if (generator === 'faker_number') {
      const min = params.min ?? 0;
      const max = params.max ?? 100;
      return faker.number.int({ min, max });
    }
    if (generator === 'sequential') {
      const start = params.start ?? 1;
      const increment = params.increment ?? 1;
      return start + increment; // Simplified for MVP
    }
    if (generator === 'enum_select') {
      return this.randomEnum(params.values || []);
    }
    if (generator === 'constant') {
      return params.value;
    }

    this.logger.warn(`Unknown generator: ${generator}`);
    return null;
  }

  /**
   * Execute a statistical generation rule (uses distributions)
   * @param rule Statistical rule with distribution type and parameters
   * @returns Generated value
   */
  private executeStatisticalRule(rule: any): any {
    const dist = rule.distribution;
    const params = rule.distributionParams || {};

    if (dist === 'normal') {
      const mean = params.mean ?? 0;
      const stddev = params.stddev ?? 1;
      return this.generateNormal(mean, stddev);
    }
    if (dist === 'uniform') {
      const min = params.min ?? 0;
      const max = params.max ?? 1;
      return Math.random() * (max - min) + min;
    }
    if (dist === 'lognormal') {
      // Generate log-normal distribution
      const mu = params.mu ?? 0;
      const sigma = params.sigma ?? 1;
      const normal = this.generateNormal(mu, sigma);
      return Math.exp(normal);
    }
    if (dist === 'exponential') {
      const lambda = params.lambda ?? 1;
      return -Math.log(1 - Math.random()) / lambda;
    }
    if (dist === 'poisson') {
      const lambda = params.lambda ?? 1;
      return this.generatePoisson(lambda);
    }

    this.logger.warn(`Unknown distribution: ${dist}`);
    return null;
  }

  /**
   * Execute an LLM-based generation rule (calls Ollama)
   * @param rule LLM rule with prompt template
   * @param context Current component data for filling template variables
   * @returns Generated string value
   */
  private async executeLLMRule(rule: any, context: Record<string, any>): Promise<string> {
    try {
      // Fill prompt template with context variables
      const prompt = this.fillPromptTemplate(rule.promptTemplate || '', context);

      // Call Ollama with the prompt
      const response = await this.ollamaService.callModel(
        prompt,
        'Generate a single value based on the prompt. Return only the value, no explanation.',
        rule.temperature || 0.7,
        rule.maxTokens || 150,
      );

      return response.trim();
    } catch (error) {
      this.logger.error(`LLM rule execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill prompt template with context variables
   * Replaces {{variable}} syntax with values from context
   * @param template Prompt template string
   * @param context Context object with variable values
   * @returns Filled prompt string
   */
  private fillPromptTemplate(template: string, context: any): string {
    let filled = template;
    for (const [key, value] of Object.entries(context)) {
      filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return filled;
  }

  /**
   * Select a random value from an enum array
   * @param values Array of possible values
   * @returns Random value from array
   */
  private randomEnum(values: any[]): any {
    if (!values || values.length === 0) {
      return null;
    }
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Generate a value from normal distribution using Box-Muller transform
   * @param mean Mean of the distribution
   * @param stddev Standard deviation of the distribution
   * @returns Normally distributed random value
   */
  private generateNormal(mean: number, stddev: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stddev;
  }

  /**
   * Generate a value from Poisson distribution
   * @param lambda Rate parameter
   * @returns Poisson distributed random value
   */
  private generatePoisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;

    do {
      k++;
      p *= Math.random();
    } while (p > L);

    return k - 1;
  }
}
