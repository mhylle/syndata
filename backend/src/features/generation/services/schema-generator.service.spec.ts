import { Test, TestingModule } from '@nestjs/testing';
import { SchemaGeneratorService } from './schema-generator.service';
import { OllamaService } from './ollama.service';

describe('SchemaGeneratorService', () => {
  let service: SchemaGeneratorService;
  let ollamaService: OllamaService;

  beforeEach(async () => {
    const mockOllamaService = {
      callModel: jest.fn(),
      getLastCallDuration: jest.fn().mockReturnValue(5000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchemaGeneratorService,
        {
          provide: OllamaService,
          useValue: mockOllamaService,
        },
      ],
    }).compile();

    service = module.get<SchemaGeneratorService>(SchemaGeneratorService);
    ollamaService = module.get<OllamaService>(OllamaService);
  });

  it('should generate clarifying questions from description', async () => {
    const mockResponse = JSON.stringify({
      clarifyingQuestions: [
        {
          questionId: 'q1',
          question: 'Should records include timestamps?',
          questionType: 'categorical',
        },
        {
          questionId: 'q2',
          question: 'How many fields approximately?',
          questionType: 'numeric',
        },
      ],
      thoughtProcess: 'The user wants...',
    });

    jest.spyOn(ollamaService, 'callModel').mockResolvedValue(mockResponse);

    const result = await service.generateInitialQuestions(
      'I need customer records',
      { businessContext: 'E-commerce' },
      'req-123',
    );

    expect(result.clarifyingQuestions).toHaveLength(2);
    expect(result.conversationId).toBeDefined();
    expect(result.requestId).toBe('req-123');
  });

  it('should retry if LLM does not ask questions', async () => {
    const badResponse = JSON.stringify({
      clarifyingQuestions: [],
      thoughtProcess: 'No questions needed',
    });

    const goodResponse = JSON.stringify({
      clarifyingQuestions: [
        {
          questionId: 'q1',
          question: 'What is the purpose?',
          questionType: 'open_text',
        },
      ],
      thoughtProcess: 'Now asking questions...',
    });

    jest
      .spyOn(ollamaService, 'callModel')
      .mockResolvedValueOnce(badResponse)
      .mockResolvedValueOnce(goodResponse);

    const result = await service.generateInitialQuestions(
      'I need data',
      {},
      'req-123',
    );

    expect(result.clarifyingQuestions).toHaveLength(1);
    expect(ollamaService.callModel).toHaveBeenCalledTimes(2);
  });

  it('should generate full schema from answers', async () => {
    const mockSchema = JSON.stringify({
      schemaMetadata: {
        name: 'Customer Data',
        description: 'Customer records',
        datasetType: 'custom',
        llmModel: 'llama3.3',
        conversationTurns: 2,
        overallConfidence: 0.88,
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
            componentType: 'customer_info',
            description: 'Customer information',
            confidence: 0.9,
            isArray: false,
            fields: {
              name: {
                type: 'string',
                confidence: 0.95,
                description: 'Customer name',
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
    });

    // Add a small delay to simulate async processing
    jest.spyOn(ollamaService, 'callModel').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return mockSchema;
    });

    const result = await service.generateSchema(
      'I need customer records',
      [
        { questionId: 'q1', answer: 'Yes, include timestamps' },
        { questionId: 'q2', answer: '5-7 fields' },
      ],
      'conv-123',
      'req-123',
    );

    expect(result.schema).toBeDefined();
    expect(result.schema.rootStructure.components).toHaveLength(1);
    expect(result.timing.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle invalid JSON response from LLM', async () => {
    jest
      .spyOn(ollamaService, 'callModel')
      .mockResolvedValue('This is not JSON at all');

    await expect(
      service.generateSchema('test', [], 'conv-123', 'req-123'),
    ).rejects.toThrow();
  });
});
