import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Dataset, GenerationJob } from '../../shared/models/api.models';

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

  // Configuration
  transformationPrompt = '';
  maxCount: number | null = null;

  // State
  loading = false;
  loadingJobs = false;
  error: string | null = null;
  success: string | null = null;

  // Job tracking
  jobId: string | null = null;
  jobStatus: string | null = null;
  jobProgress = 0;
  private pollTimer: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDatasets();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadDatasets(): void {
    this.apiService.getDatasets(this.projectId).subscribe({
      next: (datasets) => {
        // Exclude the target dataset from sources
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
    if (!this.sourceDatasetId) return;

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
      // Estimate record count from job progress
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

  generate(): void {
    if (!this.sourceDatasetId) {
      this.error = 'Please select a source dataset';
      return;
    }
    if (!this.transformationPrompt.trim()) {
      this.error = 'Please enter a transformation prompt';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.jobId = null;
    this.jobStatus = null;
    this.jobProgress = 0;

    this.apiService.generateFromDataset(this.projectId, this.datasetId, {
      sourceDatasetId: this.sourceDatasetId,
      sourceJobId: this.sourceJobId || undefined,
      transformationPrompt: this.transformationPrompt,
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
