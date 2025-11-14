import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Dataset } from '../../shared/models/api.models';

@Component({
  selector: 'app-datasets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './datasets-list.component.html',
  styleUrls: ['./datasets-list.component.scss']
})
export class DatasetsListComponent implements OnInit {
  datasets: Dataset[] = [];
  loading = false;
  error: string | null = null;
  showForm = false;
  newDataset = { name: '', schemaDefinition: {} };
  projects: any[] = [];
  selectedProjectId = '';

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
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadDatasets(): void {
    if (!this.selectedProjectId) return;
    this.loading = true;
    this.apiService.getDatasets(this.selectedProjectId).subscribe({
      next: (data) => {
        this.datasets = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load datasets';
        this.loading = false;
      }
    });
  }

  onProjectChange(): void {
    this.loadDatasets();
  }

  createDataset(): void {
    if (!this.newDataset.name.trim()) {
      alert('Dataset name is required');
      return;
    }

    this.apiService.createDataset(this.selectedProjectId, {
      name: this.newDataset.name,
      schemaDefinition: this.newDataset.schemaDefinition
    }).subscribe({
      next: () => {
        this.showForm = false;
        this.newDataset = { name: '', schemaDefinition: {} };
        this.loadDatasets();
      },
      error: (err) => {
        this.error = 'Failed to create dataset';
        console.error(err);
      }
    });
  }
}
