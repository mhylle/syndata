import { Component, Input, Output, EventEmitter } from '@angular/core';
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
export class DataGenerationConfigComponent {
  @Input() projectId: string = '';
  @Input() datasetId: string = '';
  @Input() datasetName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() generationComplete = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Generation configuration
  count = 100;
  minComponentConfidence = 60; // 0-100 for UI slider (will convert to 0-1)
  minRuleConfidence = 50;
  minFieldConfidence = 40;

  constructor(private apiService: ApiService) {}

  generateData(): void {
    if (this.count < 1 || this.count > 10000) {
      this.error = 'Count must be between 1 and 10000';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    this.apiService.generateFromSchema(
      this.projectId,
      this.datasetId,
      {
        count: this.count,
        minComponentConfidence: this.minComponentConfidence / 100,
        minRuleConfidence: this.minRuleConfidence / 100,
        minFieldConfidence: this.minFieldConfidence / 100,
      }
    ).subscribe({
      next: (response) => {
        this.success = `Generation job created! Job ID: ${response.jobId}. Generating ${response.count} records...`;
        this.loading = false;
        // Wait 2 seconds then close and notify parent
        setTimeout(() => {
          this.generationComplete.emit();
        }, 2000);
      },
      error: (err) => {
        this.error = 'Failed to start generation job. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
