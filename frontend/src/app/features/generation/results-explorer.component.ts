import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';

@Component({
  selector: 'app-results-explorer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-explorer.component.html',
  styleUrls: ['./results-explorer.component.scss']
})
export class ResultsExplorerComponent implements OnInit {
  records: any[] = [];
  loading = false;
  jobId = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Placeholder implementation
  }
}
