import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h2>Dashboard</h2>
      <p>Dashboard component placeholder - to be implemented in later tasks</p>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 2rem;
    }
  `]
})
export class DashboardComponent {}
