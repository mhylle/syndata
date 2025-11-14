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
  status: 'pending' | 'running' | 'completed' | 'failed';
  count: number;
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
