import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

@Component({
  selector: 'app-data-generation-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-generation-config.component.html',
  styleUrls: ['./data-generation-config.component.scss']
})
export class DataGenerationConfigComponent implements OnDestroy {
  @Input() projectId: string = '';
  @Input() datasetId: string = '';
  @Input() datasetName: string = '';
  @Input() isAISchema: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() generationComplete = new EventEmitter<void>();

  Math = Math;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Job tracking
  jobId: string | null = null;
  jobStatus: string | null = null;
  jobProgress = 0;
  private pollTimer: any = null;

  // Generation configuration
  count = 100;
  minComponentConfidence = 60;
  minRuleConfidence = 50;
  minFieldConfidence = 40;

  constructor(private apiService: ApiService) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  generateData(): void {
    if (this.count < 1 || this.count > 10000) {
      this.error = 'Count must be between 1 and 10000';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.jobId = null;
    this.jobStatus = null;
    this.jobProgress = 0;

    this.apiService.generateFromSchema(
      this.projectId,
      this.datasetId,
      {
        count: this.count,
        minComponentConfidence: this.isAISchema ? this.minComponentConfidence / 100 : undefined,
        minRuleConfidence: this.isAISchema ? this.minRuleConfidence / 100 : undefined,
        minFieldConfidence: this.isAISchema ? this.minFieldConfidence / 100 : undefined,
      }
    ).subscribe({
      next: (response) => {
        this.jobId = response.jobId;
        this.jobStatus = 'running';
        this.success = `Generation started — ${response.count} records`;
        this.startPolling();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start generation job. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
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
          this.success = `Done! Generated ${job.count} records.`;
          setTimeout(() => this.generationComplete.emit(), 1500);
        } else if (job.status === 'cancelled') {
          this.stopPolling();
          this.loading = false;
          this.success = `Generation cancelled at ${this.jobProgress}%.`;
        } else if (job.status === 'failed') {
          this.stopPolling();
          this.loading = false;
          this.error = 'Generation failed. Check backend logs for details.';
          this.success = null;
        }
      },
      error: () => {
        // Silently continue polling on transient errors
      }
    });
  }

  cancelGeneration(): void {
    if (!this.jobId) return;
    this.apiService.cancelJob(this.projectId, this.jobId).subscribe({
      next: () => {
        // Polling will pick up the 'cancelled' status
      },
      error: () => {
        this.error = 'Failed to cancel job.';
      }
    });
  }

  onClose(): void {
    this.stopPolling();
    this.close.emit();
  }
}
