import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="project-detail">
      <h2>Project Detail</h2>
      <p>Project detail component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .project-detail {
      padding: 2rem;
    }
  `]
})
export class ProjectDetailComponent {}
