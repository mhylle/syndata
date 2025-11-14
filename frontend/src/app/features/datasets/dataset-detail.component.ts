import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dataset-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dataset-detail">
      <h2>Dataset Detail</h2>
      <p>Dataset detail component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .dataset-detail {
      padding: 2rem;
    }
  `]
})
export class DatasetDetailComponent {}
