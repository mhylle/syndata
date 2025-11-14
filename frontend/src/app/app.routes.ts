// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects-list.component').then(m => m.ProjectsListComponent) },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/project-detail.component').then(m => m.ProjectDetailComponent) },
      { path: 'datasets', loadComponent: () => import('./features/datasets/datasets-list.component').then(m => m.DatasetsListComponent) },
      { path: 'datasets/:id', loadComponent: () => import('./features/datasets/dataset-detail.component').then(m => m.DatasetDetailComponent) },
      { path: 'generation', loadComponent: () => import('./features/generation/generation.component').then(m => m.GenerationComponent) },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
    ]
  }
];
