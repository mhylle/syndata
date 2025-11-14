import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-generation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="generation">
      <h2>Data Generation</h2>
      <p>Generation component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .generation {
      padding: 2rem;
    }
  `]
})
export class GenerationComponent {}
