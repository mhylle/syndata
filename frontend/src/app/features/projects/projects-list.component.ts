import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="projects-list">
      <h2>Projects</h2>
      <p>Projects list component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .projects-list {
      padding: 2rem;
    }
  `]
})
export class ProjectsListComponent {}
