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
