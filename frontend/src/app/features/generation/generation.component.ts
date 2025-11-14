import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Dataset, GenerationJob, GenerateRequest } from '../../shared/models/api.models';

@Component({
  selector: 'app-generation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generation.component.html',
  styleUrls: ['./generation.component.scss']
})
export class GenerationComponent implements OnInit {
  projects: any[] = [];
  datasets: Dataset[] = [];
  generationJobs: GenerationJob[] = [];
  selectedProjectId = '';
  selectedDatasetId = '';
  recordCount = 100;
  loading = false;
  generating = false;
  error: string | null = null;
  message: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        if (projects.length > 0) {
          this.selectedProjectId = projects[0].id;
          this.loadDatasets();
          this.loadGenerationJobs();
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadDatasets(): void {
    if (!this.selectedProjectId) return;
    this.apiService.getDatasets(this.selectedProjectId).subscribe({
      next: (datasets) => {
        this.datasets = datasets;
        if (datasets.length > 0) {
          this.selectedDatasetId = datasets[0].id;
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadGenerationJobs(): void {
    if (!this.selectedProjectId) return;
    this.apiService.getGenerationJobs(this.selectedProjectId).subscribe({
      next: (jobs) => {
        this.generationJobs = jobs.reverse(); // Show newest first
      },
      error: (err) => console.error(err)
    });
  }

  onProjectChange(): void {
    this.loadDatasets();
    this.loadGenerationJobs();
  }

  generateData(): void {
    if (!this.selectedDatasetId) {
      this.error = 'Please select a dataset';
      return;
    }

    this.generating = true;
    this.error = null;
    this.message = null;

    const request: GenerateRequest = {
      datasetId: this.selectedDatasetId,
      count: this.recordCount
    };

    this.apiService.generateData(this.selectedProjectId, request).subscribe({
      next: (job) => {
        this.message = `Generation job started: ${job.id}`;
        this.generationJobs.unshift(job);
        this.generating = false;
        // Auto-refresh jobs
        setTimeout(() => this.loadGenerationJobs(), 2000);
      },
      error: (err) => {
        this.error = 'Failed to start generation';
        this.generating = false;
        console.error(err);
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#ffd700',
      'running': '#667eea',
      'completed': '#28a745',
      'failed': '#dc3545'
    };
    return colors[status] || '#999';
  }
}
