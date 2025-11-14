// frontend/src/app/layout/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Projects', route: '/projects', icon: '📁' },
    { label: 'Datasets', route: '/datasets', icon: '📋' },
    { label: 'Generation', route: '/generation', icon: '⚙️' },
  ];

  constructor(public router: Router) {}

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }
}
