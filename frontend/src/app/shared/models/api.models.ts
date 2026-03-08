// frontend/src/app/shared/models/api.models.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  datasets?: Dataset[];
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  schemaDefinition: any;
  createdAt: Date;
  elements?: Element[];
}

export interface Element {
  id: string;
  datasetId: string;
  name: string;
  type: string;
  definition: any;
  createdAt: Date;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  datasetId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  count: number;
  progress?: number;
  config: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface Record {
  id: string;
  projectId: string;
  generationJobId: string;
  data: any;
  isComposite: boolean;
  createdAt: Date;
}

export interface GenerateRequest {
  datasetId: string;
  count: number;
  rules?: any;
  compositionConfig?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Schema generation models
export interface GenerateSchemaDto {
  description: string;
  businessContext?: string;
  targetRecordCount?: number;
  domainExpertise?: string;
}

export interface ClarifyingQuestion {
  questionId: string;
  question: string;
  questionType: 'categorical' | 'numeric' | 'open_text';
  choices?: string[];
  reasoning?: string;
}

export interface GenerateSchemaResponse {
  conversationId: string;
  clarifyingQuestions: ClarifyingQuestion[];
  requestId: string;
}

export interface RefineSchemaDto {
  answers: Array<{ questionId: string; answer: string }>;
}

export interface SchemaField {
  type: string;
  confidence: number;
  description: string;
  constraints?: any;
}

export interface GenerationRule {
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
  promptTemplate?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SchemaComponent {
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

export interface SyntheticSchemaDto {
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

export interface RefineSchemaResponse {
  schema: SyntheticSchemaDto;
  conversationHistory: Array<{
    turn: number;
    role: string;
    content: string;
  }>;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}
