import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

@Component({
  selector: 'app-records-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './records-viewer.component.html',
  styleUrls: ['./records-viewer.component.scss']
})
export class RecordsViewerComponent implements OnInit {
  @Input() projectId: string = '';
  @Input() jobId: string = '';
  @Input() jobStatus: string = 'pending';

  records: any[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  // Column configuration
  columns: string[] = [];
  displayColumns: string[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.projectId && this.jobId) {
      this.loadRecords();
    }
  }

  loadRecords(): void {
    if (!this.projectId || !this.jobId) {
      this.error = 'Project ID and Job ID are required';
      return;
    }

    this.loading = true;
    this.error = null;

    const skip = (this.currentPage - 1) * this.pageSize;

    this.apiService.getRecords(this.projectId, this.jobId, skip, this.pageSize).subscribe({
      next: (records) => {
        this.records = records;
        this.loading = false;

        // Extract columns from first record
        if (records.length > 0 && this.columns.length === 0) {
          const firstRecord = records[0];
          if (firstRecord.data) {
            this.columns = Object.keys(firstRecord.data).sort();
            this.displayColumns = [...this.columns];
          }
        }

        // Calculate total pages (assuming API returns data)
        // Note: In a real app, you'd get total count from API
        if (records.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          this.totalPages = this.currentPage + 1; // Estimate
        }
      },
      error: (err) => {
        this.error = `Failed to load records: ${err.message}`;
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    this.currentPage++;
    this.loadRecords();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadRecords();
    }
  }

  goToPage(page: number): void {
    if (page > 0) {
      this.currentPage = page;
      this.loadRecords();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadRecords();
  }

  toggleColumn(column: string): void {
    const index = this.displayColumns.indexOf(column);
    if (index > -1) {
      this.displayColumns.splice(index, 1);
    } else {
      this.displayColumns.push(column);
      this.displayColumns.sort();
    }
  }

  isColumnDisplayed(column: string): boolean {
    return this.displayColumns.includes(column);
  }

  getValue(record: any, column: string): any {
    if (record.data && record.data[column] !== undefined) {
      const value = record.data[column];
      // Format complex values
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    }
    return '-';
  }

  exportToCSV(): void {
    if (this.records.length === 0) {
      alert('No records to export');
      return;
    }

    // Create CSV header
    const headers = this.displayColumns.join(',');

    // Create CSV rows
    const rows = this.records.map(record => {
      return this.displayColumns
        .map(column => {
          const value = this.getValue(record, column);
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `records_${this.jobId}_page_${this.currentPage}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportToJSON(): void {
    if (this.records.length === 0) {
      alert('No records to export');
      return;
    }

    const json = JSON.stringify(
      this.records.map(record => ({
        id: record.id,
        generationJobId: record.generationJobId,
        data: record.data,
        createdAt: record.createdAt
      })),
      null,
      2
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `records_${this.jobId}_page_${this.currentPage}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
