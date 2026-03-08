import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Dataset, GenerationJob } from '../../shared/models/api.models';

interface FieldMapping {
  targetField: string;
  targetType: string;
  mode: 'map' | 'llm';
  sourceField: string;
  prompt: string;
  sourceContextFields: string[];
}

@Component({
  selector: 'app-derived-generation-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './derived-generation-config.component.html',
  styleUrls: ['./derived-generation-config.component.scss']
})
export class DerivedGenerationConfigComponent implements OnInit, OnDestroy {
  @Input() projectId = '';
  @Input() datasetId = '';
  @Input() datasetName = '';
  @Output() close = new EventEmitter<void>();
  @Output() generationComplete = new EventEmitter<void>();

  Math = Math;

  // Source selection
  datasets: Dataset[] = [];
  sourceDatasetId = '';
  sourceJobs: GenerationJob[] = [];
  sourceJobId = '';
  sourceRecordCount = 0;

  // Target & source field info
  targetFields: { name: string; type: string }[] = [];
  sourceFields: string[] = [];

  // Field mappings
  fieldMappings: FieldMapping[] = [];
  globalPrompt = '';

  // Configuration
  maxCount: number | null = null;

  // State
  loading = false;
  loadingJobs = false;
  loadingTarget = false;
  error: string | null = null;
  success: string | null = null;

  // AI prompt improvement
  improvingField: string | null = null;

  // Job tracking
  jobId: string | null = null;
  jobStatus: string | null = null;
  jobProgress = 0;
  private pollTimer: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadTargetSchema();
    this.loadDatasets();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /** Load target dataset schema to populate field mappings */
  loadTargetSchema(): void {
    this.loadingTarget = true;
    this.apiService.getDataset(this.projectId, this.datasetId).subscribe({
      next: (dataset) => {
        this.targetFields = this.extractFields(dataset.schemaDefinition);
        this.fieldMappings = this.targetFields.map(f => ({
          targetField: f.name,
          targetType: f.type,
          mode: 'llm',
          sourceField: '',
          prompt: '',
          sourceContextFields: [],
        }));
        this.loadingTarget = false;
      },
      error: () => {
        this.error = 'Failed to load target dataset schema';
        this.loadingTarget = false;
      }
    });
  }

  /** Extract field names from either simple or AI schema format */
  extractFields(schema: any): { name: string; type: string }[] {
    if (!schema) return [];

    // Simple schema: { fields: [{ name, type }] }
    if (schema.fields && Array.isArray(schema.fields)) {
      return schema.fields.map((f: any) => ({ name: f.name, type: f.type || 'string' }));
    }

    // AI schema: { rootStructure: { components: [{ fields: { fieldName: { type } } }] } }
    if (schema.rootStructure?.components) {
      const fields: { name: string; type: string }[] = [];
      for (const comp of schema.rootStructure.components) {
        if (comp.fields) {
          for (const [name, def] of Object.entries(comp.fields)) {
            fields.push({ name, type: (def as any).type || 'string' });
          }
        }
      }
      return fields;
    }

    return [];
  }

  loadDatasets(): void {
    this.apiService.getDatasets(this.projectId).subscribe({
      next: (datasets) => {
        this.datasets = datasets.filter(d => d.id !== this.datasetId);
      },
      error: () => {
        this.error = 'Failed to load datasets';
      }
    });
  }

  onSourceDatasetChange(): void {
    this.sourceJobId = '';
    this.sourceRecordCount = 0;
    this.sourceJobs = [];
    this.sourceFields = [];
    if (!this.sourceDatasetId) return;

    // Load source dataset schema for field mapping dropdowns
    this.apiService.getDataset(this.projectId, this.sourceDatasetId).subscribe({
      next: (dataset) => {
        this.sourceFields = this.extractFields(dataset.schemaDefinition).map(f => f.name);
      }
    });

    this.loadingJobs = true;
    this.apiService.getGenerationJobs(this.projectId).subscribe({
      next: (jobs) => {
        this.sourceJobs = jobs.filter(
          j => j.datasetId === this.sourceDatasetId && (j.status === 'completed' || j.status === 'cancelled')
        );
        this.loadingJobs = false;
      },
      error: () => {
        this.loadingJobs = false;
        this.error = 'Failed to load generation jobs';
      }
    });
  }

  onSourceJobChange(): void {
    const job = this.sourceJobs.find(j => j.id === this.sourceJobId);
    if (job) {
      this.sourceRecordCount = job.status === 'completed'
        ? job.count
        : Math.round(job.count * (job.progress || 0) / 100);
    } else {
      this.sourceRecordCount = 0;
    }
  }

  get effectiveCount(): number {
    if (this.maxCount && this.maxCount > 0) {
      return Math.min(this.maxCount, this.sourceRecordCount);
    }
    return this.sourceRecordCount;
  }

  get hasValidMappings(): boolean {
    return this.fieldMappings.length > 0 && this.fieldMappings.every(m => {
      if (m.mode === 'map') return !!m.sourceField;
      return true; // LLM mode is always valid (prompt is optional — global prompt or auto-generation)
    });
  }

  get mappedFieldCount(): number {
    return this.fieldMappings.filter(m => m.mode === 'map').length;
  }

  get llmFieldCount(): number {
    return this.fieldMappings.filter(m => m.mode === 'llm').length;
  }

  toggleContextField(mapping: FieldMapping, field: string): void {
    const idx = mapping.sourceContextFields.indexOf(field);
    if (idx >= 0) {
      mapping.sourceContextFields.splice(idx, 1);
    } else {
      mapping.sourceContextFields.push(field);
    }
  }

  selectAllContextFields(mapping: FieldMapping): void {
    if (mapping.sourceContextFields.length === this.sourceFields.length) {
      mapping.sourceContextFields = [];
    } else {
      mapping.sourceContextFields = [...this.sourceFields];
    }
  }

  improveFieldPrompt(mapping: FieldMapping, index: number): void {
    if (!mapping.prompt?.trim()) return;
    const key = `field-${index}`;
    this.improvingField = key;

    this.apiService.improvePrompt(this.projectId, {
      text: mapping.prompt,
      fieldType: 'prompt',
      fieldName: mapping.targetField,
      schemaFields: this.sourceFields,
    }).subscribe({
      next: (res) => {
        mapping.prompt = res.improved;
        this.improvingField = null;
      },
      error: () => {
        this.improvingField = null;
      },
    });
  }

  improveGlobalPrompt(): void {
    if (!this.globalPrompt?.trim()) return;
    this.improvingField = 'global';

    this.apiService.improvePrompt(this.projectId, {
      text: this.globalPrompt,
      fieldType: 'prompt',
      fieldName: 'global_context',
      schemaFields: this.targetFields.map(f => f.name),
    }).subscribe({
      next: (res) => {
        this.globalPrompt = res.improved;
        this.improvingField = null;
      },
      error: () => {
        this.improvingField = null;
      },
    });
  }

  /** Auto-map target fields to matching source field names */
  autoMap(): void {
    for (const mapping of this.fieldMappings) {
      const match = this.sourceFields.find(
        sf => sf.toLowerCase() === mapping.targetField.toLowerCase()
      );
      if (match) {
        mapping.mode = 'map';
        mapping.sourceField = match;
      }
    }
  }

  generate(): void {
    if (!this.sourceDatasetId) {
      this.error = 'Please select a source dataset';
      return;
    }
    if (!this.hasValidMappings) {
      this.error = 'Please configure all field mappings (mapped fields need a source field selected)';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.jobId = null;
    this.jobStatus = null;
    this.jobProgress = 0;

    const mappings = this.fieldMappings.map(m => ({
      targetField: m.targetField,
      mode: m.mode,
      ...(m.mode === 'map' ? { sourceField: m.sourceField } : {}),
      ...(m.mode === 'llm' && m.prompt.trim() ? { prompt: m.prompt.trim() } : {}),
      ...(m.mode === 'llm' && m.sourceContextFields.length > 0 ? { sourceContextFields: m.sourceContextFields } : {}),
    }));

    this.apiService.generateFromDataset(this.projectId, this.datasetId, {
      sourceDatasetId: this.sourceDatasetId,
      sourceJobId: this.sourceJobId || undefined,
      fieldMappings: mappings as any,
      globalPrompt: this.globalPrompt.trim() || undefined,
      count: this.maxCount || undefined,
    }).subscribe({
      next: (response) => {
        this.jobId = response.jobId;
        this.jobStatus = 'running';
        this.success = `Transformation started — ${response.count} records`;
        this.startPolling();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start derived generation';
        this.loading = false;
      }
    });
  }

  cancelGeneration(): void {
    if (!this.jobId) return;
    this.apiService.cancelJob(this.projectId, this.jobId).subscribe({
      error: () => { this.error = 'Failed to cancel job.'; }
    });
  }

  onClose(): void {
    this.stopPolling();
    this.close.emit();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.pollJobStatus(), 2000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private pollJobStatus(): void {
    if (!this.jobId) return;

    this.apiService.getJob(this.projectId, this.jobId).subscribe({
      next: (job) => {
        this.jobStatus = job.status;
        this.jobProgress = job.progress || 0;

        if (job.status === 'completed') {
          this.stopPolling();
          this.loading = false;
          this.success = `Done! Transformed ${job.count} records.`;
          setTimeout(() => this.generationComplete.emit(), 1500);
        } else if (job.status === 'cancelled') {
          this.stopPolling();
          this.loading = false;
          this.success = `Transformation cancelled at ${this.jobProgress}%.`;
        } else if (job.status === 'failed') {
          this.stopPolling();
          this.loading = false;
          this.error = 'Transformation failed. Check backend logs.';
          this.success = null;
        }
      },
      error: () => {}
    });
  }
}
