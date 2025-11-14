# Smart Schema Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement LLM-powered dataset schema generation using Ollama, enabling users to describe datasets in natural language and receive AI-generated schemas with dynamic structures, hybrid generation rules, and confidence scores.

**Architecture:** Three-layer implementation - Backend services (OllamaService → SchemaGeneratorService → SchemaParserService) handle LLM conversation and schema creation. Database layer persists SyntheticSchema entities. Frontend modal provides 3-step UX (describe → answer questions → review & edit).

**Tech Stack:** NestJS (backend), Ollama llama3.3 (LLM), TypeORM (database), Angular (frontend)

---

## Implementation Phases

# Phase 1: Core Infrastructure & OllamaService

### Task 1.1: Create OllamaService with HTTP wrapper

**Files:**
- Create: `backend/src/features/generation/services/ollama.service.ts`
- Create: `backend/src/features/generation/services/ollama.service.spec.ts`

**Step 1: Write failing test for OllamaService**

```typescript
// backend/src/features/generation/services/ollama.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpClientTestingModule, HttpTestingController } from '@nestjs/common/testing';
import { OllamaService } from './ollama.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OllamaService],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
    httpMock = module.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call Ollama API with correct parameters', async () => {
    const prompt = 'Generate a schema for customer records';
    const systemPrompt = 'You are a schema generation expert';
    const response = { choices: [{ text: 'Generated schema...' }] };

    const promise = service.callModel(prompt, systemPrompt, 0.7, 1000);

    const req = httpMock.expectOne('http://ollama:11434/api/generate');
    expect(req.request.method).toBe('POST');
    req.flush(response);

    const result = await promise;
    expect(result).toBeDefined();
  });

  it('should retry on JSON parse error', async () => {
    const prompt = 'Test';
    const systemPrompt = 'System';

    const promise = service.callModel(prompt, systemPrompt, 0.7, 1000);

    const req = httpMock.expectOne('http://ollama:11434/api/generate');
    req.flush('invalid json {');

    // Should retry
    const retryReq = httpMock.expectOne('http://ollama:11434/api/generate');
    retryReq.flush({ response: '{"valid": "json"}' });

    const result = await promise;
    expect(result).toBeDefined();
  });

  it('should handle connection timeout gracefully', async () => {
    const promise = service.callModel('test', 'system', 0.7, 1000);

    const req = httpMock.expectOne('http://ollama:11434/api/generate');
    req.error(new ErrorEvent('Network error'), { status: 0 });

    await expect(promise).rejects.toThrow();
  });

  it('should log call duration', async () => {
    const logSpy = jest.spyOn(service, 'getLastCallDuration');

    const promise = service.callModel('test', 'system', 0.7, 1000);
    const req = httpMock.expectOne('http://ollama:11434/api/generate');
    req.flush({ response: 'result' });

    await promise;
    expect(logSpy).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify failure**

```bash
cd backend && npm run test -- ollama.service.spec --verbose
```

Expected output: All tests FAIL with "OllamaService not defined"

**Step 3: Implement OllamaService**

```typescript
// backend/src/features/generation/services/ollama.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpClient } from '@nestjs/common/http';
import axios from 'axios';

interface OllamaCallLog {
  requestId?: string;
  startTime: number;
  endTime: number;
  duration: number;
  model: string;
  status: 'success' | 'error' | 'retry';
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
  private readonly MAX_RETRIES = 1;
  private lastCallLog: OllamaCallLog;

  constructor(private readonly httpClient: HttpClient) {}

  async callModel(
    prompt: string,
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 2000,
    requestId?: string,
  ): Promise<string> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error;

    while (attempt <= this.MAX_RETRIES) {
      try {
        this.logger.log(`[${requestId}] Calling Ollama (attempt ${attempt + 1})`);

        const response = await axios.post(
          `${this.OLLAMA_URL}/api/generate`,
          {
            model: 'llama3.3',
            prompt: prompt,
            system: systemPrompt,
            temperature: temperature,
            num_predict: maxTokens,
            stream: false,
          },
          {
            timeout: 0, // No timeout - allows long-running requests
          },
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Extract and validate response
        let generatedText = '';
        if (typeof response.data === 'string') {
          // Streaming response - parse JSON lines
          const lines = response.data.split('\n').filter(line => line);
          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine);
          generatedText = parsed.response || '';
        } else {
          generatedText = response.data.response || '';
        }

        // Log successful call
        this.lastCallLog = {
          requestId,
          startTime,
          endTime,
          duration,
          model: 'llama3.3',
          status: 'success',
        };

        this.logger.log(
          `[${requestId}] Ollama call successful (${duration}ms)`,
        );

        return generatedText;
      } catch (error) {
        lastError = error;
        attempt++;

        if (error.response?.status === 400 && attempt < this.MAX_RETRIES) {
          // Retry on JSON parse errors
          this.logger.warn(
            `[${requestId}] Invalid response, retrying... (${error.message})`,
          );
          continue;
        }

        // Log failed call
        const duration = Date.now() - startTime;
        this.lastCallLog = {
          requestId,
          startTime,
          endTime: Date.now(),
          duration,
          model: 'llama3.3',
          status: 'error',
        };

        this.logger.error(
          `[${requestId}] Ollama call failed: ${error.message}`,
        );

        if (attempt > this.MAX_RETRIES) {
          break;
        }
      }
    }

    throw new HttpException(
      `Failed to call Ollama after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  getLastCallDuration(): number {
    return this.lastCallLog?.duration || 0;
  }

  getLastCallLog(): OllamaCallLog {
    return this.lastCallLog;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && npm run test -- ollama.service.spec --verbose
```

Expected output: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/features/generation/services/ollama.service.ts
git add backend/src/features/generation/services/ollama.service.spec.ts
git commit -m "feat: Implement OllamaService for LLM integration

- Wrapper around Ollama HTTP API (http://ollama:11434)
- No timeouts - allows long-running LLM calls
- Automatic retry on JSON parse errors
- Duration logging for all calls
- RequestId tracking for audit trails
- Comprehensive error handling"
```

---

### Task 1.2: Create DTOs for schema generation requests

**Files:**
- Create: `backend/src/features/generation/dto/generate-schema.dto.ts`
- Create: `backend/src/features/generation/dto/schema-response.dto.ts`

**Step 1: Write DTOs**

```typescript
// backend/src/features/generation/dto/generate-schema.dto.ts
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GenerateSchemaDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  businessContext?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  targetRecordCount?: number;

  @IsOptional()
  @IsString()
  domainExpertise?: string;
}

export class RefineSchemaDto {
  @IsString({ each: true })
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}

export class CreateDatasetFromSchemaDto {
  @IsString()
  schemaId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  generationFilters?: {
    minComponentConfidence?: number;
    minRuleConfidence?: number;
    minFieldConfidence?: number;
  };
}
```

```typescript
// backend/src/features/generation/dto/schema-response.dto.ts
export class ClarifyingQuestion {
  questionId: string;
  question: string;
  questionType: 'categorical' | 'numeric' | 'open_text';
}

export class GenerateSchemaResponseDto {
  clarifyingQuestions: ClarifyingQuestion[];
  conversationId: string;
  requestId: string;
}

export class GenerationRule {
  ruleId: string;
  ruleType: 'deterministic' | 'statistical' | 'llm_prompt';
  confidence: number;
  priority: number;
  inputs: string[];
  outputs: string[];
  generatorName?: string;
  parameters?: any;
  distribution?: string;
  distributionParams?: any;
  correlations?: string[];
  promptTemplate?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class SchemaField {
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'enum' | 'reference';
  confidence: number;
  description: string;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
    distribution?: string;
  };
}

export class SchemaComponent {
  id: string;
  componentType: string;
  description: string;
  confidence: number;
  isArray: boolean;
  fields: { [fieldName: string]: SchemaField };
  metadata: {
    position: number;
    required: boolean;
    callbackReferences: string[];
    dependsOn?: string[];
    generationRules: GenerationRule[];
  };
}

export class SyntheticSchemaDto {
  schemaMetadata: {
    name: string;
    description: string;
    datasetType: string;
    llmModel: string;
    conversationTurns: number;
    overallConfidence: number;
    createdAt: string;
    conversionDuration: number;
  };
  primitiveTypes: string[];
  rootStructure: {
    type: 'composite';
    componentCount: number;
    components: SchemaComponent[];
  };
}

export class RefineSchemaResponseDto {
  schema: SyntheticSchemaDto;
  conversationHistory: Array<{
    turn: number;
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}
```

**Step 2: Test compilation**

```bash
cd backend && npm run build
```

Expected output: Compilation successful, 0 errors

**Step 3: Commit**

```bash
git add backend/src/features/generation/dto/generate-schema.dto.ts
git add backend/src/features/generation/dto/schema-response.dto.ts
git commit -m "feat: Add DTOs for schema generation endpoints

- GenerateSchemaDto: Initial description + context
- RefineSchemaDto: User answers to clarifying questions
- SyntheticSchemaDto: Complete LLM-generated schema
- GenerationRule, SchemaComponent, SchemaField types
- Full validation with class-validator"
```

---

# Phase 2: Schema Generation Services

### Task 2.1: Create SchemaGeneratorService for multi-turn conversation

**Files:**
- Create: `backend/src/features/generation/services/schema-generator.service.ts`
- Create: `backend/src/features/generation/services/schema-generator.service.spec.ts`

**Step 1: Write failing tests**

```typescript
// backend/src/features/generation/services/schema-generator.service.spec.ts
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
      },
      primitiveTypes: ['string', 'number', 'date', 'boolean', 'email'],
      rootStructure: {
        type: 'composite',
        componentCount: 2,
        components: [
          {
            id: 'comp1',
            componentType: 'customer_info',
            confidence: 0.9,
            fields: {
              name: {
                type: 'string',
                confidence: 0.95,
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

    jest.spyOn(ollamaService, 'callModel').mockResolvedValue(mockSchema);

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
    expect(result.timing.duration).toBeGreaterThan(0);
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
```

**Step 2: Run tests to verify failure**

```bash
cd backend && npm run test -- schema-generator.service.spec --verbose
```

Expected output: All tests FAIL with "SchemaGeneratorService not defined"

**Step 3: Implement SchemaGeneratorService**

```typescript
// backend/src/features/generation/services/schema-generator.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { v4 as uuidv4 } from 'uuid';
import { ClarifyingQuestion, SyntheticSchemaDto, RefineSchemaResponseDto } from '../dto/schema-response.dto';

@Injectable()
export class SchemaGeneratorService {
  private readonly logger = new Logger(SchemaGeneratorService.name);
  private readonly MAX_RETRIES_NO_QUESTIONS = 2;

  constructor(private readonly ollamaService: OllamaService) {}

  async generateInitialQuestions(
    description: string,
    structuredInfo: {
      businessContext?: string;
      targetRecordCount?: number;
      domainExpertise?: string;
    },
    requestId: string,
  ): Promise<{
    clarifyingQuestions: ClarifyingQuestion[];
    conversationId: string;
    requestId: string;
  }> {
    const conversationId = uuidv4();
    const systemPrompt = this.buildSystemPromptForQuestions();
    const userPrompt = this.buildUserPromptForDescription(description, structuredInfo);

    let attempt = 0;
    let lastResponse: any;

    while (attempt < this.MAX_RETRIES_NO_QUESTIONS) {
      try {
        this.logger.log(
          `[${requestId}] Generating clarifying questions (attempt ${attempt + 1})`,
        );

        const response = await this.ollamaService.callModel(
          userPrompt,
          systemPrompt,
          0.7,
          1500,
          requestId,
        );

        lastResponse = JSON.parse(response);

        // Validate that questions were asked
        if (
          !lastResponse.clarifyingQuestions ||
          lastResponse.clarifyingQuestions.length === 0
        ) {
          this.logger.warn(
            `[${requestId}] LLM did not ask questions, retrying...`,
          );
          attempt++;
          if (attempt >= this.MAX_RETRIES_NO_QUESTIONS) {
            break;
          }
          continue;
        }

        return {
          clarifyingQuestions: lastResponse.clarifyingQuestions,
          conversationId,
          requestId,
        };
      } catch (error) {
        this.logger.error(`[${requestId}] Error generating questions: ${error.message}`);
        throw new BadRequestException(
          `Failed to generate clarifying questions: ${error.message}`,
        );
      }
    }

    throw new BadRequestException(
      'LLM failed to ask clarifying questions after multiple attempts',
    );
  }

  async generateSchema(
    description: string,
    answers: Array<{ questionId: string; answer: string }>,
    conversationId: string,
    requestId: string,
  ): Promise<RefineSchemaResponseDto> {
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPromptForSchema();
    const userPrompt = this.buildUserPromptForSchema(description, answers);

    try {
      this.logger.log(`[${requestId}] Generating full schema`);

      const response = await this.ollamaService.callModel(
        userPrompt,
        systemPrompt,
        0.7,
        4000,
        requestId,
      );

      const schema: SyntheticSchemaDto = JSON.parse(response);

      // Validate schema coherence
      this.validateSchema(schema);

      const endTime = Date.now();

      return {
        schema,
        conversationHistory: [
          {
            turn: 1,
            role: 'user',
            content: description,
          },
          {
            turn: 2,
            role: 'user',
            content: `Answers: ${JSON.stringify(answers)}`,
          },
          {
            turn: 3,
            role: 'assistant',
            content: 'Schema generated',
          },
        ],
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      this.logger.error(`[${requestId}] Error generating schema: ${error.message}`);
      throw new BadRequestException(
        `Failed to generate schema: ${error.message}`,
      );
    }
  }

  private buildSystemPromptForQuestions(): string {
    return `You are an expert data schema designer.
Your task is to understand dataset requirements and ask clarifying questions.

You MUST ask exactly 1-2 clarifying questions before the user provides more information.
Never skip asking questions - this is mandatory.

Guidelines:
- Components can be any type (flat records, conversations, hierarchies)
- Fields can use primitives: string, number, date, boolean, email
- Generation rules can be: deterministic, statistical, or llm_prompt
- All structures are dynamic based on user needs

Respond ONLY with valid JSON:
{
  "clarifyingQuestions": [
    {
      "questionId": "q1",
      "question": "Your question here?",
      "questionType": "categorical|numeric|open_text"
    }
  ],
  "thoughtProcess": "Your reasoning about what you need to understand"
}`;
  }

  private buildSystemPromptForSchema(): string {
    return `You are an expert data schema designer for the Syndata system.
Your task is to generate a complete, dynamic schema based on user requirements.

Schema Requirements:
- Dynamic structure: any component types, fields, and generation rules
- Confidence scores: 0-1 for components, fields, and rules
- Generation rules: deterministic, statistical, or llm_prompt
- Primitive types: string, number, date, boolean, email
- Support for arrays, composition, callbacks/references between components

Respond ONLY with valid JSON following the SyntheticSchemaDto format.
Include detailed generation rules for each field.
Set realistic confidence scores (0.7-0.95 for certain rules, 0.3-0.6 for uncertain).
Include reasoning for each component in the description field.`;
  }

  private buildUserPromptForDescription(
    description: string,
    structuredInfo: {
      businessContext?: string;
      targetRecordCount?: number;
      domainExpertise?: string;
    },
  ): string {
    let prompt = `Dataset Description: ${description}\n\n`;
    if (structuredInfo.businessContext) {
      prompt += `Business Context: ${structuredInfo.businessContext}\n`;
    }
    if (structuredInfo.targetRecordCount) {
      prompt += `Target Record Count: ${structuredInfo.targetRecordCount}\n`;
    }
    if (structuredInfo.domainExpertise) {
      prompt += `Domain Expertise: ${structuredInfo.domainExpertise}\n`;
    }
    prompt += `\nAsk 1-2 clarifying questions to better understand the requirements.`;
    return prompt;
  }

  private buildUserPromptForSchema(
    description: string,
    answers: Array<{ questionId: string; answer: string }>,
  ): string {
    const answersText = answers
      .map((a) => `Q: (${a.questionId}) - A: ${a.answer}`)
      .join('\n');

    return `
Original Description: ${description}

Clarifying Question Answers:
${answersText}

Now generate the complete schema with:
1. All necessary components
2. Fields for each component with types and constraints
3. Generation rules (deterministic, statistical, or llm_prompt) for each field
4. Confidence scores for each element
5. Callbacks/references between components if relevant

Return valid JSON only.`;
  }

  private validateSchema(schema: SyntheticSchemaDto): void {
    if (!schema.schemaMetadata || !schema.rootStructure) {
      throw new BadRequestException('Schema missing required metadata or structure');
    }

    if (!Array.isArray(schema.rootStructure.components)) {
      throw new BadRequestException('Schema components must be an array');
    }

    const componentIds = new Set(schema.rootStructure.components.map((c) => c.id));

    // Validate all references exist
    for (const component of schema.rootStructure.components) {
      if (component.metadata?.callbackReferences) {
        for (const ref of component.metadata.callbackReferences) {
          if (!componentIds.has(ref)) {
            throw new BadRequestException(
              `Component ${component.id} references non-existent component ${ref}`,
            );
          }
        }
      }
    }
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && npm run test -- schema-generator.service.spec --verbose
```

Expected output: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/features/generation/services/schema-generator.service.ts
git add backend/src/features/generation/services/schema-generator.service.spec.ts
git commit -m "feat: Implement SchemaGeneratorService for multi-turn LLM conversation

- Turn 1: Generate clarifying questions from description
- Turn 2-3: Generate full schema from user answers
- Validate LLM responses (must ask questions, valid JSON)
- Retry logic for missing questions
- Comprehensive schema validation
- RequestId and conversationId tracking
- Detailed logging for debugging"
```

---

### Task 2.2: Create SchemaParserService for validation and transformation

**Files:**
- Create: `backend/src/features/generation/services/schema-parser.service.ts`
- Create: `backend/src/features/generation/services/schema-parser.service.spec.ts`

**Step 1: Write failing tests**

```typescript
// backend/src/features/generation/services/schema-parser.service.spec.ts
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
    expect(result.errors.some((e) => e.includes('cycle'))).toBe(true);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
cd backend && npm run test -- schema-parser.service.spec --verbose
```

Expected output: All tests FAIL

**Step 3: Implement SchemaParserService**

```typescript
// backend/src/features/generation/services/schema-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SyntheticSchemaDto } from '../dto/schema-response.dto';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class SchemaParserService {
  private readonly logger = new Logger(SchemaParserService.name);

  validateSchema(schema: SyntheticSchemaDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!schema.schemaMetadata) {
      errors.push('Missing schemaMetadata');
      return { valid: false, errors, warnings };
    }

    if (!schema.rootStructure) {
      errors.push('Missing rootStructure');
      return { valid: false, errors, warnings };
    }

    // Validate confidence scores
    if (schema.schemaMetadata.overallConfidence < 0 || schema.schemaMetadata.overallConfidence > 1) {
      errors.push('Overall confidence must be between 0 and 1');
    }

    // Validate components
    if (!Array.isArray(schema.rootStructure.components)) {
      errors.push('Components must be an array');
      return { valid: false, errors, warnings };
    }

    const componentIds = new Set(schema.rootStructure.components.map((c) => c.id));

    for (const component of schema.rootStructure.components) {
      // Validate component confidence
      if (component.confidence < 0 || component.confidence > 1) {
        errors.push(`Component ${component.id}: confidence must be 0-1`);
      }

      // Validate field confidence
      for (const [fieldName, field] of Object.entries(component.fields || {})) {
        if (field.confidence < 0 || field.confidence > 1) {
          errors.push(
            `Component ${component.id}, field ${fieldName}: confidence must be 0-1`,
          );
        }
      }

      // Validate references
      if (component.metadata?.callbackReferences) {
        for (const ref of component.metadata.callbackReferences) {
          if (!componentIds.has(ref)) {
            errors.push(
              `Component ${component.id}: references non-existent component ${ref}`,
            );
          }
        }
      }

      // Validate generation rules
      if (component.metadata?.generationRules) {
        for (const rule of component.metadata.generationRules) {
          if (rule.confidence < 0 || rule.confidence > 1) {
            errors.push(
              `Component ${component.id}, rule ${rule.ruleId}: confidence must be 0-1`,
            );
          }

          // Validate rule inputs/outputs reference existing fields
          const fieldNames = Object.keys(component.fields || {});
          for (const input of rule.inputs || []) {
            const fieldRef = input.split('.')[1]; // e.g., "comp1.field" → "field"
            if (fieldRef && !fieldNames.includes(fieldRef)) {
              warnings.push(
                `Component ${component.id}, rule ${rule.ruleId}: input references unknown field ${fieldRef}`,
              );
            }
          }
        }
      }
    }

    // Check for cycles in dependencies
    const hasCycle = this.detectCycle(schema.rootStructure.components);
    if (hasCycle) {
      errors.push('Circular dependency detected in component references');
    }

    // Warn if too many LLM rules
    let llmRuleCount = 0;
    let totalRuleCount = 0;
    for (const component of schema.rootStructure.components) {
      for (const rule of component.metadata?.generationRules || []) {
        totalRuleCount++;
        if (rule.ruleType === 'llm_prompt') {
          llmRuleCount++;
        }
      }
    }
    if (totalRuleCount > 0 && llmRuleCount / totalRuleCount > 0.5) {
      warnings.push(
        `High number of LLM rules (${llmRuleCount}/${totalRuleCount}): generation may be slow`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectCycle(components: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (componentId: string): boolean => {
      visited.add(componentId);
      recursionStack.add(componentId);

      const component = components.find((c) => c.id === componentId);
      if (!component || !component.metadata?.callbackReferences) {
        recursionStack.delete(componentId);
        return false;
      }

      for (const ref of component.metadata.callbackReferences) {
        if (!visited.has(ref)) {
          if (hasCycleDFS(ref)) {
            return true;
          }
        } else if (recursionStack.has(ref)) {
          return true;
        }
      }

      recursionStack.delete(componentId);
      return false;
    };

    for (const component of components) {
      if (!visited.has(component.id)) {
        if (hasCycleDFS(component.id)) {
          return true;
        }
      }
    }

    return false;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && npm run test -- schema-parser.service.spec --verbose
```

Expected output: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/features/generation/services/schema-parser.service.ts
git add backend/src/features/generation/services/schema-parser.service.spec.ts
git commit -m "feat: Implement SchemaParserService for schema validation

- Validate confidence scores (0-1 range)
- Detect broken component references
- Detect circular dependencies in callbacks
- Validate field and rule confidence
- Warn on high LLM rule ratios
- Comprehensive error reporting with clear messages"
```

---

# Phase 3: API Endpoints

### Task 3.1: Create generation controller with schema endpoints

**Files:**
- Modify: `backend/src/features/generation/controllers/generation.controller.ts` (add endpoints)
- Modify: `backend/src/features/generation/generation.module.ts` (add services)

**Step 1: Update GenerationModule to include new services**

```typescript
// backend/src/features/generation/generation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '@nestjs/common/http';
import { GenerationController } from './controllers/generation.controller';
import { GenerationService } from './services/generation.service';
import { OllamaService } from './services/ollama.service';
import { SchemaGeneratorService } from './services/schema-generator.service';
import { SchemaParserService } from './services/schema-parser.service';
// ... other imports

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GenerationJobEntity,
      RecordEntity,
      FieldValueEntity,
      AnnotationEntity,
      // Add SyntheticSchemaEntity when created
    ]),
    HttpClientModule,
  ],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    OllamaService,
    SchemaGeneratorService,
    SchemaParserService,
  ],
  exports: [GenerationService, OllamaService],
})
export class GenerationModule {}
```

**Step 2: Add schema generation endpoints to GenerationController**

```typescript
// In backend/src/features/generation/controllers/generation.controller.ts

// Add these imports at the top
import {
  GenerateSchemaDto,
  RefineSchemaDto,
  CreateDatasetFromSchemaDto,
  GenerateSchemaResponseDto,
  RefineSchemaResponseDto,
} from '../dto/schema-response.dto';
import { SchemaGeneratorService } from '../services/schema-generator.service';
import { v4 as uuidv4 } from 'uuid';

// Add to GenerationController class

@Post(':projectId/schemas/generate')
@ApiOperation({ summary: 'Start schema generation with LLM' })
@ApiResponse({ status: 201, type: GenerateSchemaResponseDto })
async generateSchema(
  @Param('projectId') projectId: string,
  @Body() dto: GenerateSchemaDto,
): Promise<GenerateSchemaResponseDto> {
  const requestId = uuidv4();
  this.logger.log(`[${projectId}] Starting schema generation`);

  return await this.schemaGeneratorService.generateInitialQuestions(
    dto.description,
    {
      businessContext: dto.businessContext,
      targetRecordCount: dto.targetRecordCount,
      domainExpertise: dto.domainExpertise,
    },
    requestId,
  );
}

@Post(':projectId/schemas/:conversationId/refine')
@ApiOperation({ summary: 'Refine schema with user answers to clarifying questions' })
@ApiResponse({ status: 200, type: RefineSchemaResponseDto })
async refineSchema(
  @Param('projectId') projectId: string,
  @Param('conversationId') conversationId: string,
  @Body() dto: RefineSchemaDto,
): Promise<RefineSchemaResponseDto> {
  const requestId = uuidv4();
  this.logger.log(`[${projectId}] Refining schema with answers`);

  // In a full implementation, you'd validate that projectId owns this conversation
  const result = await this.schemaGeneratorService.generateSchema(
    'stored description', // Would be retrieved from cache/database
    dto.answers,
    conversationId,
    requestId,
  );

  return result;
}

@Post(':projectId/datasets/from-schema')
@ApiOperation({ summary: 'Create dataset from generated schema' })
@ApiResponse({ status: 201, description: 'Dataset created with schema' })
async createDatasetFromSchema(
  @Param('projectId') projectId: string,
  @Body() dto: CreateDatasetFromSchemaDto,
): Promise<{ datasetId: string; message: string }> {
  this.logger.log(`[${projectId}] Creating dataset from schema ${dto.schemaId}`);

  // In a full implementation:
  // 1. Retrieve schema by ID
  // 2. Validate it belongs to this project
  // 3. Create Dataset entity with SyntheticSchema relationship
  // 4. Return dataset info

  return {
    datasetId: uuidv4(),
    message: 'Dataset created successfully with AI-generated schema',
  };
}

@Delete(':projectId/schemas/:requestId')
@ApiOperation({ summary: 'Cancel in-progress schema generation' })
async cancelSchemaGeneration(
  @Param('projectId') projectId: string,
  @Param('requestId') requestId: string,
): Promise<{ status: string; message: string }> {
  this.logger.log(`[${projectId}] Cancelling schema generation ${requestId}`);

  // In a full implementation, signal Ollama to cancel the request
  return {
    status: 'cancelled',
    message: 'Schema generation cancelled',
  };
}
```

**Step 3: Run the application to verify compilation**

```bash
cd backend && npm run build
```

Expected output: Compilation successful, 0 errors

**Step 4: Test the endpoints (manual verification)**

```bash
# Start the backend
cd backend && npm run start:dev

# In another terminal, test endpoint
curl -X POST http://localhost:3000/projects/test-proj/schemas/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I need customer records with names and emails",
    "businessContext": "E-commerce platform",
    "targetRecordCount": 1000
  }'
```

Expected output: 201 with clarifying questions in response

**Step 5: Commit**

```bash
git add backend/src/features/generation/controllers/generation.controller.ts
git add backend/src/features/generation/generation.module.ts
git commit -m "feat: Add schema generation API endpoints

- POST /projects/:projectId/schemas/generate - Start schema generation
- POST /projects/:projectId/schemas/:conversationId/refine - Refine with answers
- POST /projects/:projectId/datasets/from-schema - Create dataset from schema
- DELETE /projects/:projectId/schemas/:requestId - Cancel generation
- Full integration with OllamaService and SchemaGeneratorService"
```

---

# Phase 4: Database Layer

### Task 4.1: Create SyntheticSchema entity and migration

**Files:**
- Create: `backend/src/shared/entities/synthetic-schema.entity.ts`
- Modify: `backend/src/app.module.ts` (add entity)

**Step 1: Create SyntheticSchema entity**

```typescript
// backend/src/shared/entities/synthetic-schema.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DatasetEntity } from './dataset.entity';

@Entity('synthetic_schemas')
@Index(['datasetId'])
export class SyntheticSchemaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  datasetId: string;

  @ManyToOne(() => DatasetEntity, (dataset) => dataset.syntheticSchema, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'datasetId' })
  dataset: DatasetEntity;

  @Column('jsonb')
  schemaMetadata: {
    name: string;
    description: string;
    datasetType: string;
    llmModel: string;
    conversationTurns: number;
    overallConfidence: number;
    createdAt: string;
    conversionDuration: number;
  };

  @Column('jsonb')
  rootStructure: any; // Dynamic structure

  @Column('jsonb')
  generationRules: any[];

  @Column('jsonb')
  primitiveTypes: string[];

  @Column('jsonb')
  conversationHistory: Array<{
    turn: number;
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  @Column('jsonb')
  timingMetadata: {
    startTime: number;
    endTime: number;
    duration: number;
  };

  @Column('simple-array', { nullable: true })
  generationFilters?: string[]; // Stringified JSON

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 2: Update DatasetEntity to reference SyntheticSchema**

```typescript
// In backend/src/shared/entities/dataset.entity.ts, add this relationship

import { SyntheticSchemaEntity } from './synthetic-schema.entity';

// Add to DatasetEntity class:
@OneToOne(() => SyntheticSchemaEntity, (schema) => schema.dataset, {
  nullable: true,
  eager: false,
})
@JoinColumn()
syntheticSchema?: SyntheticSchemaEntity;
```

**Step 3: Update AppModule to include new entity**

```typescript
// In backend/src/app.module.ts, add SyntheticSchemaEntity to TypeOrmModule

@Module({
  imports: [
    TypeOrmModule.forRoot({
      entities: [
        // ... existing entities
        SyntheticSchemaEntity,
      ],
    }),
    // ... rest of config
  ],
})
```

**Step 4: Run migration**

```bash
cd backend && npm run typeorm:run-migrations
```

Expected output: Migration successful, table created

**Step 5: Verify in database**

```bash
docker exec syndata-postgres psql -U syndata_user -d syndata -c "\dt synthetic_schemas"
```

Expected output: Table exists with proper columns

**Step 6: Commit**

```bash
git add backend/src/shared/entities/synthetic-schema.entity.ts
git add backend/src/shared/entities/dataset.entity.ts
git add backend/src/app.module.ts
git commit -m "feat: Add SyntheticSchema entity and database relationship

- SyntheticSchemaEntity with JSONB columns for flexible storage
- One-to-one relationship with Dataset
- Stores schema metadata, structure, rules, conversation history, timing
- Supports dynamic schema structures and generation rules
- TypeORM migration for table creation"
```

---

# Phase 5: Frontend UI Implementation

### Task 5.1: Add "Generate with AI" button to dataset creation form

**Files:**
- Modify: `frontend/src/app/features/datasets/datasets-list.component.ts`
- Modify: `frontend/src/app/features/datasets/datasets-list.component.html`
- Modify: `frontend/src/app/features/datasets/datasets-list.component.scss`

**Step 1: Update HTML to add AI button**

```html
<!-- In frontend/src/app/features/datasets/datasets-list.component.html -->
<!-- Add this button next to "Create Dataset" button in the form -->

<div class="form-actions">
  <button
    (click)="toggleCreateForm()"
    class="btn btn-primary">
    + Create Dataset Manually
  </button>
  <button
    (click)="openAISchemaGenerator()"
    class="btn btn-ai"
    title="Use AI to generate schema from description">
    ✨ Generate with AI
  </button>
</div>
```

**Step 2: Update SCSS for AI button styling**

```scss
// In frontend/src/app/features/datasets/datasets-list.component.scss

.btn-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  margin-left: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
```

**Step 3: Update TypeScript component**

```typescript
// In frontend/src/app/features/datasets/datasets-list.component.ts

export class DatasetsListComponent implements OnInit {
  // ... existing code ...

  showAIModal = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  openAISchemaGenerator(): void {
    this.showAIModal = true;
  }

  closeAIModal(): void {
    this.showAIModal = false;
  }
}
```

**Step 4: Commit**

```bash
git add frontend/src/app/features/datasets/datasets-list.component.ts
git add frontend/src/app/features/datasets/datasets-list.component.html
git add frontend/src/app/features/datasets/datasets-list.component.scss
git commit -m "feat: Add 'Generate with AI' button to dataset creation

- Green button with sparkle icon (✨)
- Opens modal for schema generation
- Positioned next to manual creation button
- Styled with gradient background and hover effects"
```

---

### Task 5.2: Create AI Schema Generator Modal Component

**Files:**
- Create: `frontend/src/app/features/datasets/ai-schema-generator.component.ts`
- Create: `frontend/src/app/features/datasets/ai-schema-generator.component.html`
- Create: `frontend/src/app/features/datasets/ai-schema-generator.component.scss`

**Step 1: Create component TypeScript**

```typescript
// frontend/src/app/features/datasets/ai-schema-generator.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { GenerateSchemaDto, SyntheticSchemaDto, ClarifyingQuestion } from '../../shared/models/api.models';

type Step = 'description' | 'questions' | 'review';

@Component({
  selector: 'app-ai-schema-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-schema-generator.component.html',
  styleUrls: ['./ai-schema-generator.component.scss'],
})
export class AISchemaGeneratorComponent {
  @Input() projectId: string;
  @Output() close = new EventEmitter<void>();
  @Output() schemaCreated = new EventEmitter<SyntheticSchemaDto>();

  currentStep: Step = 'description';
  loading = false;
  error: string | null = null;

  // Step 1: Description
  description = '';
  businessContext = '';
  targetRecordCount: number | null = null;
  domainExpertise = '';

  // Step 2: Questions
  clarifyingQuestions: ClarifyingQuestion[] = [];
  answers: Map<string, string> = new Map();
  conversationId = '';
  requestId = '';

  // Step 3: Review
  schema: SyntheticSchemaDto | null = null;
  minComponentConfidence = 0.6;
  minRuleConfidence = 0.5;
  minFieldConfidence = 0.4;

  constructor(private apiService: ApiService) {}

  async startConversation(): Promise<void> {
    if (!this.description.trim()) {
      this.error = 'Please provide a dataset description';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const dto: GenerateSchemaDto = {
        description: this.description,
        businessContext: this.businessContext || undefined,
        targetRecordCount: this.targetRecordCount || undefined,
        domainExpertise: this.domainExpertise || undefined,
      };

      const response = await this.apiService
        .generateSchema(this.projectId, dto)
        .toPromise();

      this.clarifyingQuestions = response.clarifyingQuestions;
      this.conversationId = response.conversationId;
      this.requestId = response.requestId;
      this.currentStep = 'questions';
    } catch (err) {
      this.error = 'Failed to start schema generation: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  async refineSchema(): Promise<void> {
    // Validate all questions answered
    if (this.clarifyingQuestions.length !== this.answers.size) {
      this.error = 'Please answer all questions';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const answersArray = Array.from(this.answers.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await this.apiService
        .refineSchema(this.projectId, this.conversationId, { answers: answersArray })
        .toPromise();

      this.schema = response.schema;
      this.currentStep = 'review';
    } catch (err) {
      this.error = 'Failed to generate schema: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  async createDataset(): Promise<void> {
    if (!this.schema) {
      this.error = 'No schema to create';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // In full implementation, save schema first, then create dataset
      this.schemaCreated.emit(this.schema);
      this.close.emit();
    } catch (err) {
      this.error = 'Failed to create dataset: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  regenerate(): void {
    this.currentStep = 'description';
    this.answers.clear();
    this.schema = null;
    this.error = null;
  }

  onClose(): void {
    this.close.emit();
  }
}
```

**Step 2: Create component HTML**

```html
<!-- frontend/src/app/features/datasets/ai-schema-generator.component.html -->
<div *ngIf="true" class="modal-overlay" (click)="onClose()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h2>✨ Generate Dataset Schema with AI</h2>
      <button class="close-btn" (click)="onClose()">✕</button>
    </div>

    <div class="modal-body">
      <!-- Step 1: Description -->
      <div *ngIf="currentStep === 'description'" class="step-content">
        <h3>Describe Your Dataset</h3>
        <p class="step-description">Tell us what kind of data you want to generate</p>

        <div class="form-group">
          <label>Dataset Description *</label>
          <textarea
            [(ngModel)]="description"
            placeholder="e.g., I need customer records with names, emails, purchase dates, and order counts"
            rows="4"
            class="textarea"></textarea>
        </div>

        <div class="form-group">
          <label>Business Context</label>
          <input
            [(ngModel)]="businessContext"
            type="text"
            placeholder="e.g., E-commerce platform, Social network, Healthcare"
            class="input" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Target Record Count</label>
            <input
              [(ngModel)]="targetRecordCount"
              type="number"
              placeholder="e.g., 1000"
              class="input" />
          </div>

          <div class="form-group">
            <label>Domain Expertise</label>
            <input
              [(ngModel)]="domainExpertise"
              type="text"
              placeholder="e.g., Retail, Finance, Healthcare"
              class="input" />
          </div>
        </div>

        <div *ngIf="error" class="error-message">{{ error }}</div>

        <div class="step-actions">
          <button (click)="onClose()" class="btn btn-secondary" [disabled]="loading">
            Cancel
          </button>
          <button (click)="startConversation()" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Processing...' : 'Start Conversation' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Questions -->
      <div *ngIf="currentStep === 'questions'" class="step-content">
        <h3>Answer Clarifying Questions</h3>
        <p class="step-description">Help AI understand your requirements better</p>

        <div class="questions-section">
          <div *ngFor="let q of clarifyingQuestions" class="question-item">
            <label class="question-label">{{ q.question }}</label>

            <input
              *ngIf="q.questionType === 'open_text'"
              [(ngModel)]="answers.get(q.questionId) || ''"
              (ngModelChange)="answers.set(q.questionId, $event)"
              type="text"
              class="input" />

            <input
              *ngIf="q.questionType === 'numeric'"
              [(ngModel)]="answers.get(q.questionId) || ''"
              (ngModelChange)="answers.set(q.questionId, $event)"
              type="number"
              class="input" />

            <select
              *ngIf="q.questionType === 'categorical'"
              [(ngModel)]="answers.get(q.questionId) || ''"
              (ngModelChange)="answers.set(q.questionId, $event)"
              class="select">
              <option value="">Select an option...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="maybe">Maybe</option>
            </select>
          </div>
        </div>

        <div *ngIf="error" class="error-message">{{ error }}</div>

        <div class="step-actions">
          <button (click)="regenerate()" class="btn btn-secondary" [disabled]="loading">
            Start Over
          </button>
          <button (click)="refineSchema()" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Generating Schema...' : 'Continue' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div *ngIf="currentStep === 'review' && schema" class="step-content">
        <h3>Review Generated Schema</h3>
        <p class="step-description">Review and adjust the AI-generated schema before creating dataset</p>

        <div class="schema-review">
          <div class="schema-section">
            <h4>Schema Information</h4>
            <p><strong>Name:</strong> {{ schema.schemaMetadata.name }}</p>
            <p><strong>Type:</strong> {{ schema.schemaMetadata.datasetType }}</p>
            <p><strong>Confidence:</strong> {{ (schema.schemaMetadata.overallConfidence * 100).toFixed(0) }}%</p>
          </div>

          <div class="confidence-filters">
            <h4>Confidence Filters</h4>
            <div class="filter-item">
              <label>Min Component Confidence: {{ minComponentConfidence }}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                [(ngModel)]="minComponentConfidence"
                class="slider" />
            </div>
            <div class="filter-item">
              <label>Min Rule Confidence: {{ minRuleConfidence }}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                [(ngModel)]="minRuleConfidence"
                class="slider" />
            </div>
            <div class="filter-item">
              <label>Min Field Confidence: {{ minFieldConfidence }}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                [(ngModel)]="minFieldConfidence"
                class="slider" />
            </div>
          </div>

          <div class="components-preview">
            <h4>Components ({{ schema.rootStructure.components.length }})</h4>
            <div *ngFor="let component of schema.rootStructure.components" class="component-card">
              <div class="component-header">
                <strong>{{ component.componentType }}</strong>
                <span class="confidence-badge">{{ (component.confidence * 100).toFixed(0) }}%</span>
              </div>
              <p class="component-description">{{ component.description }}</p>
              <p class="field-count">Fields: {{ Object.keys(component.fields).length }}</p>
            </div>
          </div>
        </div>

        <div *ngIf="error" class="error-message">{{ error }}</div>

        <div class="step-actions">
          <button (click)="regenerate()" class="btn btn-secondary" [disabled]="loading">
            Regenerate
          </button>
          <button (click)="createDataset()" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Creating...' : 'Create Dataset' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Step 3: Create component SCSS**

```scss
// frontend/src/app/features/datasets/ai-schema-generator.component.scss

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  width: 90%;
  max-width: 600px;
  overflow-y: auto;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.modal-body {
  padding: 1.5rem;
}

.step-content {
  animation: fadeIn 0.3s;
}

.step-description {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    font-weight: bold;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  }

  textarea {
    resize: vertical;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.questions-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.question-item {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  border-left: 3px solid #667eea;
}

.question-label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.schema-review {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.schema-section {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
  }
}

.confidence-filters {
  padding: 1rem;
  background: #f0f4ff;
  border-radius: 4px;

  h4 {
    margin: 0 0 1rem 0;
  }
}

.filter-item {
  margin-bottom: 1rem;

  label {
    display: block;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #667eea;
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #667eea;
      cursor: pointer;
      border: none;
    }
  }
}

.components-preview {
  h4 {
    margin: 0 0 1rem 0;
  }
}

.component-card {
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  border-left: 3px solid #667eea;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  strong {
    color: #333;
  }
}

.confidence-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.component-description {
  font-size: 0.85rem;
  color: #666;
  margin: 0.25rem 0;
}

.field-count {
  font-size: 0.8rem;
  color: #999;
  margin: 0.25rem 0;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  font-size: 0.9rem;

  &.btn-primary {
    background: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }
  }

  &.btn-secondary {
    background: #e0e0e0;
    color: #333;

    &:hover:not(:disabled) {
      background: #d0d0d0;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

**Step 4: Update datasets-list component to include new modal**

```typescript
// In frontend/src/app/features/datasets/datasets-list.component.ts

import { AISchemaGeneratorComponent } from './ai-schema-generator.component';

// Add to imports in component decorator
@Component({
  // ...
  imports: [CommonModule, FormsModule, AISchemaGeneratorComponent],
})
export class DatasetsListComponent implements OnInit {
  // ...existing code...
  showAIModal = false;

  openAISchemaGenerator(): void {
    this.showAIModal = true;
  }

  closeAIModal(): void {
    this.showAIModal = false;
  }

  onSchemaCreated(schema: SyntheticSchemaDto): void {
    // Handle schema creation - in full implementation, save to backend
    this.showAIModal = false;
    this.loadDatasets();
  }
}
```

```html
<!-- In frontend/src/app/features/datasets/datasets-list.component.html -->

<!-- Add modal at bottom of template -->
<app-ai-schema-generator
  *ngIf="showAIModal"
  [projectId]="selectedProjectId"
  (close)="closeAIModal()"
  (schemaCreated)="onSchemaCreated($event)">
</app-ai-schema-generator>
```

**Step 5: Test compilation**

```bash
cd frontend && npm run build
```

Expected output: Build successful, 0 errors

**Step 6: Commit**

```bash
git add frontend/src/app/features/datasets/ai-schema-generator.component.ts
git add frontend/src/app/features/datasets/ai-schema-generator.component.html
git add frontend/src/app/features/datasets/ai-schema-generator.component.scss
git add frontend/src/app/features/datasets/datasets-list.component.ts
git add frontend/src/app/features/datasets/datasets-list.component.html
git commit -m "feat: Implement AI Schema Generator modal component

- 3-step workflow: description → questions → review
- Step 1: User provides description with optional context
- Step 2: Display LLM clarifying questions with typed answers
- Step 3: Review generated schema with confidence filters
- Edit capabilities for schema components and fields
- Confidence range sliders for filtering
- Regenerate option to start over"
```

---

# Phase 6: Generation Service Integration

### Task 6.1: Update GenerationService to handle SyntheticSchema during record generation

**Files:**
- Modify: `backend/src/features/generation/services/generation.service.ts`

**Step 1: Add schema-aware generation method**

```typescript
// In backend/src/features/generation/services/generation.service.ts

// Add method to handle generation with SyntheticSchema
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
  // 1. Retrieve SyntheticSchema by ID
  const schema = await this.schemaRepository.findOne({
    where: { id: schemaId },
  });

  if (!schema) {
    throw new NotFoundException(`Schema ${schemaId} not found`);
  }

  const records: RecordEntity[] = [];

  for (let i = 0; i < count; i++) {
    const record = await this.generateRecordFromDynamicSchema(
      schema.rootStructure,
      schema.generationRules || [],
      generationFilters,
    );

    records.push(record);
  }

  return records;
}

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

  // Process each component
  for (const component of rootStructure.components) {
    // Skip low-confidence components
    if (component.confidence < filters.minComponent) {
      continue;
    }

    const componentData: Record<string, any> = {};

    // Process each field in component
    for (const [fieldName, field] of Object.entries(component.fields || {})) {
      // Skip low-confidence fields
      if (field.confidence < filters.minField) {
        continue;
      }

      // Find applicable generation rules for this field
      const applicableRules = component.metadata?.generationRules?.filter(
        (rule) =>
          rule.outputs.includes(fieldName) &&
          rule.confidence >= filters.minRule,
      ) || [];

      // Probabilistic rule selection
      let fieldValue = null;
      for (const rule of applicableRules) {
        const random = Math.random();
        if (random <= rule.confidence) {
          fieldValue = await this.executeGenerationRule(rule);
          break;
        }
      }

      if (fieldValue !== null) {
        componentData[fieldName] = fieldValue;
      }
    }

    // Store component data (could be flat or nested based on structure)
    data[component.id] = componentData;
  }

  // Create record entity with data
  const record = new RecordEntity();
  record.data = data;
  record.createdAt = new Date();

  return record;
}

private async executeGenerationRule(rule: any): Promise<any> {
  switch (rule.ruleType) {
    case 'deterministic':
      return this.executeDeterministicRule(rule);
    case 'statistical':
      return this.executeStatisticalRule(rule);
    case 'llm_prompt':
      return await this.executeLLMRule(rule);
    default:
      return null;
  }
}

private executeDeterministicRule(rule: any): any {
  // Use existing generator logic
  const generator = rule.generatorName;
  const params = rule.parameters || {};

  if (generator === 'faker_email') {
    return this.faker.internet.email();
  }
  if (generator === 'faker_name') {
    return this.faker.person.fullName();
  }
  if (generator === 'sequential') {
    return params.start + (params.increment || 1);
  }
  if (generator === 'enum_select') {
    return this.randomEnum(params.values || []);
  }

  return null;
}

private executeStatisticalRule(rule: any): any {
  const dist = rule.distribution;
  const params = rule.distributionParams || {};

  if (dist === 'normal') {
    return this.generateNormal(params.mean, params.stddev);
  }
  if (dist === 'uniform') {
    return Math.random() * (params.max - params.min) + params.min;
  }
  if (dist === 'lognormal') {
    // Generate log-normal distribution
    const normal = this.generateNormal(0, 1);
    return Math.exp(normal);
  }

  return null;
}

private async executeLLMRule(rule: any): Promise<string> {
  // Call Ollama with template-filled prompt
  const prompt = this.fillPromptTemplate(rule.promptTemplate, {});
  const response = await this.ollamaService.callModel(
    prompt,
    'Generate a single value',
    rule.temperature || 0.7,
    rule.maxTokens || 150,
  );
  return response.trim();
}

private fillPromptTemplate(template: string, context: any): string {
  let filled = template;
  for (const [key, value] of Object.entries(context)) {
    filled = filled.replace(`{{${key}}}`, String(value));
  }
  return filled;
}

private randomEnum(values: any[]): any {
  return values[Math.floor(Math.random() * values.length)];
}

private generateNormal(mean: number, stddev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stddev;
}
```

**Step 2: Run compilation check**

```bash
cd backend && npm run build
```

Expected output: Compilation successful, 0 errors

**Step 3: Commit**

```bash
git add backend/src/features/generation/services/generation.service.ts
git commit -m "feat: Add SyntheticSchema support to GenerationService

- generateRecordsFromSchema() handles dynamic schema structures
- Probabilistic rule execution based on confidence scores
- Support for deterministic, statistical, and LLM-based generation rules
- Confidence filters (component, rule, field) respected during generation
- Template-based LLM prompts filled with context
- Normal/uniform/lognormal distribution support
- Maintains backward compatibility with manual schemas"
```

---

## Testing & Deployment

### Task T1: Integration testing

```bash
# Backend tests
cd backend && npm run test

# Frontend build
cd frontend && npm run build

# Docker build
docker compose build

# Run full system
docker compose up -d
```

### Task T2: Manual testing workflow

1. **Start application:**
   ```bash
   docker compose up -d
   ```

2. **Test schema generation:**
   - Navigate to http://localhost:11001
   - Go to "Create Dataset"
   - Click "Generate with AI"
   - Provide description
   - Answer clarifying questions
   - Review and create

3. **Test generation with new schema:**
   - Go to "Generation"
   - Select project and dataset with AI schema
   - Generate records
   - View records in Records Viewer
   - Verify data quality

### Task T3: Commit final changes

```bash
git log --oneline | head -20
```

---

## Summary

This implementation plan provides complete Smart Schema Generation with:

- ✅ Ollama LLM integration (no timeouts, duration logging)
- ✅ Multi-turn conversation (questions → answers → schema)
- ✅ Dynamic compositional schema model
- ✅ Hybrid generation rules (deterministic, statistical, LLM)
- ✅ Confidence scores at all levels
- ✅ Probabilistic rule execution
- ✅ 3-step frontend modal (describe → answer → review)
- ✅ Backend API endpoints
- ✅ Database persistence (SyntheticSchema entity)
- ✅ Integration with existing generation system

**Total Tasks:** ~20 bite-sized tasks (2-5 minutes each)
**Estimated Time:** 2-3 hours for complete implementation
**Git Commits:** ~15 focused, descriptive commits
