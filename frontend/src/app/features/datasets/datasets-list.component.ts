import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-datasets-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="datasets-list">
      <h2>Datasets</h2>
      <p>Datasets list component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .datasets-list {
      padding: 2rem;
    }
  `]
})
export class DatasetsListComponent {}
