import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    projectCount: 0,
    datasetCount: 0,
    recentJobs: 0
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        this.stats.projectCount = projects.length;
        let totalDatasets = 0;
        projects.forEach(p => {
          totalDatasets += p.datasets?.length || 0;
        });
        this.stats.datasetCount = totalDatasets;
      }
    });
  }
}
