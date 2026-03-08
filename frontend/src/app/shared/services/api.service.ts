// frontend/src/app/shared/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Project, Dataset, Element, GenerationJob, Record, GenerateRequest,
  GenerateSchemaDto, GenerateSchemaResponse, RefineSchemaDto, RefineSchemaResponse
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===== PROJECTS =====

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/projects/${id}`, project);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }

  // ===== DATASETS =====

  getDatasets(projectId: string): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(`${this.baseUrl}/projects/${projectId}/datasets`);
  }

  getDataset(projectId: string, datasetId: string): Observable<Dataset> {
    return this.http.get<Dataset>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}`
    );
  }

  createDataset(projectId: string, dataset: Partial<Dataset>): Observable<Dataset> {
    const payload = {
      name: dataset.name,
      schema: dataset.schemaDefinition
    };
    return this.http.post<Dataset>(
      `${this.baseUrl}/projects/${projectId}/datasets`,
      payload
    );
  }

  updateDataset(projectId: string, datasetId: string, updates: Partial<Dataset>): Observable<Dataset> {
    return this.http.put<Dataset>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}`,
      updates
    );
  }

  deleteDataset(projectId: string, datasetId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}`
    );
  }

  // ===== ELEMENTS =====

  getElements(projectId: string, datasetId: string): Observable<Element[]> {
    return this.http.get<Element[]>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/elements`
    );
  }

  getElement(projectId: string, datasetId: string, elementId: string): Observable<Element> {
    return this.http.get<Element>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/elements/${elementId}`
    );
  }

  addElement(projectId: string, datasetId: string, element: Partial<Element>): Observable<Element> {
    return this.http.post<Element>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/elements`,
      element
    );
  }

  // ===== GENERATION =====

  generateData(projectId: string, request: GenerateRequest): Observable<GenerationJob> {
    return this.http.post<GenerationJob>(
      `${this.baseUrl}/projects/${projectId}/generate`,
      request
    );
  }

  getGenerationJob(projectId: string, jobId: string): Observable<GenerationJob> {
    return this.http.get<GenerationJob>(
      `${this.baseUrl}/projects/${projectId}/jobs/${jobId}`
    );
  }

  getGenerationJobs(projectId: string): Observable<GenerationJob[]> {
    return this.http.get<GenerationJob[]>(
      `${this.baseUrl}/projects/${projectId}/jobs`
    );
  }

  getRecords(projectId: string, jobId: string, skip = 0, take = 10): Observable<Record[]> {
    const params = new HttpParams()
      .set('jobId', jobId)
      .set('skip', skip.toString())
      .set('take', take.toString());
    return this.http.get<Record[]>(
      `${this.baseUrl}/projects/${projectId}/records`,
      { params }
    );
  }

  getRecord(projectId: string, recordId: string): Observable<Record> {
    return this.http.get<Record>(
      `${this.baseUrl}/projects/${projectId}/records/${recordId}`
    );
  }

  generateFromSchema(
    projectId: string,
    datasetId: string,
    config: {
      count: number;
      minComponentConfidence?: number;
      minRuleConfidence?: number;
      minFieldConfidence?: number;
    }
  ): Observable<{ jobId: string; message: string; count: number }> {
    return this.http.post<{ jobId: string; message: string; count: number }>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/generate-from-schema`,
      config
    );
  }

  getJob(projectId: string, jobId: string): Observable<{
    id: string; status: string; progress: number; count: number;
    completedAt?: string; config?: any;
  }> {
    return this.http.get<any>(
      `${this.baseUrl}/projects/${projectId}/jobs/${jobId}`
    );
  }

  // ===== SCHEMA GENERATION =====

  generateSchema(projectId: string, dto: GenerateSchemaDto): Observable<GenerateSchemaResponse> {
    return this.http.post<GenerateSchemaResponse>(
      `${this.baseUrl}/projects/${projectId}/schemas/generate`,
      dto
    );
  }

  refineSchema(projectId: string, conversationId: string, dto: RefineSchemaDto): Observable<RefineSchemaResponse> {
    return this.http.post<RefineSchemaResponse>(
      `${this.baseUrl}/projects/${projectId}/schemas/${conversationId}/refine`,
      dto
    );
  }

  createDatasetFromSchema(
    projectId: string,
    data: { name: string; schema: any }
  ): Observable<{ datasetId: string; message: string }> {
    return this.http.post<{ datasetId: string; message: string }>(
      `${this.baseUrl}/projects/${projectId}/datasets/from-schema`,
      data
    );
  }

  cancelJob(projectId: string, jobId: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/projects/${projectId}/jobs/${jobId}/cancel`,
      {}
    );
  }

  resumeJob(projectId: string, jobId: string): Observable<{ jobId: string; message: string; remaining: number }> {
    return this.http.post<{ jobId: string; message: string; remaining: number }>(
      `${this.baseUrl}/projects/${projectId}/jobs/${jobId}/resume`,
      {}
    );
  }

  deleteJob(projectId: string, jobId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/projects/${projectId}/jobs/${jobId}`
    );
  }

  // ===== AI PROMPT IMPROVEMENT =====

  improvePrompt(
    projectId: string,
    body: {
      text: string;
      fieldType: 'prompt' | 'description' | 'negativePrompt';
      fieldName: string;
      schemaFields?: string[];
    }
  ): Observable<{ improved: string }> {
    return this.http.post<{ improved: string }>(
      `${this.baseUrl}/projects/${projectId}/ai/improve-prompt`,
      body
    );
  }
}
