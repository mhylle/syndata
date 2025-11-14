// frontend/src/app/layout/main-layout.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, HeaderComponent, SidebarComponent],
  template: `
    <app-header></app-header>
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .layout-container {
      display: flex;
      height: calc(100vh - 60px);
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
      background: #f9fafb;
    }
  `]
})
export class MainLayoutComponent {}
