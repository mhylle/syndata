import { Test, TestingModule } from '@nestjs/testing';
import { SchemaParserService } from './schema-parser.service';
import { SyntheticSchemaDto } from '../dto/schema-response.dto';

describe('SchemaParserService', () => {
  let service: SchemaParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaParserService],
    }).compile();

    service = module.get<SchemaParserService>(SchemaParserService);
  });

  it('should validate schema coherence', () => {
    const validSchema: SyntheticSchemaDto = {
      schemaMetadata: {
        name: 'Test',
        description: 'Test schema',
        datasetType: 'custom',
        llmModel: 'llama3.3',
        conversationTurns: 2,
        overallConfidence: 0.8,
        createdAt: new Date().toISOString(),
        conversionDuration: 1000,
      },
      primitiveTypes: ['string', 'number', 'date', 'boolean', 'email'],
      rootStructure: {
        type: 'composite',
        componentCount: 1,
        components: [
          {
            id: 'comp1',
            componentType: 'basic',
            description: 'Basic component',
            confidence: 0.9,
            isArray: false,
            fields: {
              name: {
                type: 'string',
                confidence: 0.95,
                description: 'Name field',
                constraints: { minLength: 1, maxLength: 100 },
              },
            },
            metadata: {
              position: 1,
              required: true,
              callbackReferences: [],
              generationRules: [],
            },
          },
        ],
      },
    };

    const result = service.validateSchema(validSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid confidence scores', () => {
    const invalidSchema: SyntheticSchemaDto = {
      schemaMetadata: {
        name: 'Test',
        description: 'Test',
        datasetType: 'custom',
        llmModel: 'llama3.3',
        conversationTurns: 2,
        overallConfidence: 1.5, // Invalid: > 1
        createdAt: new Date().toISOString(),
        conversionDuration: 1000,
      },
      primitiveTypes: ['string'],
      rootStructure: {
        type: 'composite',
        componentCount: 1,
        components: [
          {
            id: 'comp1',
            componentType: 'test',
            description: 'test',
            confidence: -0.1, // Invalid: < 0
            isArray: false,
            fields: {},
            metadata: {
              position: 1,
              required: true,
              callbackReferences: [],
              generationRules: [],
            },
          },
        ],
      },
    };

    const result = service.validateSchema(invalidSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect broken references', () => {
    const invalidSchema: SyntheticSchemaDto = {
      schemaMetadata: {
        name: 'Test',
        description: 'Test',
        datasetType: 'custom',
        llmModel: 'llama3.3',
        conversationTurns: 2,
        overallConfidence: 0.8,
        createdAt: new Date().toISOString(),
        conversionDuration: 1000,
      },
      primitiveTypes: ['string'],
      rootStructure: {
        type: 'composite',
        componentCount: 1,
        components: [
          {
            id: 'comp1',
            componentType: 'test',
            description: 'test',
            confidence: 0.8,
            isArray: false,
            fields: {},
            metadata: {
              position: 1,
              required: true,
              callbackReferences: ['nonexistent'], // Invalid reference
              generationRules: [],
            },
          },
        ],
      },
    };

    const result = service.validateSchema(invalidSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('reference'))).toBe(true);
  });

  it('should detect cycles in dependencies', () => {
    const cyclicSchema: SyntheticSchemaDto = {
      schemaMetadata: {
        name: 'Test',
        description: 'Test',
        datasetType: 'custom',
        llmModel: 'llama3.3',
        conversationTurns: 2,
        overallConfidence: 0.8,
        createdAt: new Date().toISOString(),
        conversionDuration: 1000,
      },
      primitiveTypes: ['string'],
      rootStructure: {
        type: 'composite',
        componentCount: 2,
        components: [
          {
            id: 'comp1',
            componentType: 'test',
            description: 'test',
            confidence: 0.8,
            isArray: false,
            fields: {},
            metadata: {
              position: 1,
              required: true,
              callbackReferences: ['comp2'],
              generationRules: [],
            },
          },
          {
            id: 'comp2',
            componentType: 'test',
            description: 'test',
            confidence: 0.8,
            isArray: false,
            fields: {},
            metadata: {
              position: 2,
              required: true,
              callbackReferences: ['comp1'], // Creates cycle
              generationRules: [],
            },
          },
        ],
      },
    };

    const result = service.validateSchema(cyclicSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('cycle') || e.includes('Circular'))).toBe(true);
  });
});
