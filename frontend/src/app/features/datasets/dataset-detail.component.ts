import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Dataset, Element } from '../../shared/models/api.models';
import { DataGenerationConfigComponent } from './data-generation-config.component';

@Component({
  selector: 'app-dataset-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DataGenerationConfigComponent],
  templateUrl: './dataset-detail.component.html',
  styleUrls: ['./dataset-detail.component.scss']
})
export class DatasetDetailComponent implements OnInit {
  dataset: Dataset | null = null;
  elements: Element[] = [];
  loading = false;
  error: string | null = null;
  projectId = '';
  datasetId = '';
  showGenerateModal = false;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.datasetId = this.route.snapshot.paramMap.get('id') || '';
    // Get projectId from route parent
    const parent = this.route.parent;
    if (parent) {
      this.projectId = parent.snapshot.paramMap.get('projectId') || '';
    }
    this.loadDataset();
  }

  loadDataset(): void {
    if (!this.datasetId) return;
    this.loading = true;
    // Use first project for now - in production, get from context
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        if (projects.length > 0) {
          this.projectId = projects[0].id;
          this.apiService.getDataset(this.projectId, this.datasetId).subscribe({
            next: (dataset) => {
              this.dataset = dataset;
              this.loadElements();
            },
            error: (err) => {
              this.error = 'Failed to load dataset';
              this.loading = false;
            }
          });
        }
      }
    });
  }

  loadElements(): void {
    this.apiService.getElements(this.projectId, this.datasetId).subscribe({
      next: (elements) => {
        this.elements = elements;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load elements';
        this.loading = false;
      }
    });
  }

  hasAISchema(): boolean {
    if (!this.dataset?.schemaDefinition) return false;
    const schema = this.dataset.schemaDefinition;
    // Check if it's a SyntheticSchemaDto (has schemaMetadata and rootStructure)
    return !!(schema.schemaMetadata && schema.rootStructure);
  }

  openGenerateModal(): void {
    this.showGenerateModal = true;
  }

  closeGenerateModal(): void {
    this.showGenerateModal = false;
  }

  onGenerationComplete(): void {
    this.showGenerateModal = false;
    // Optionally reload the dataset or navigate to records view
    this.loadDataset();
  }
}
