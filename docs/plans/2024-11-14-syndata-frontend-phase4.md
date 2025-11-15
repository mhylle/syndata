# Syndata Frontend Phase 4 Implementation Plan

> This is a detailed implementation guide for Phase 4: Frontend Development

## Overview
Build Angular 19 standalone components for Syndata MVP with feature-based organization, reactive patterns, and comprehensive API integration.

## Architecture
- **Standalone components** (no NgModules)
- **Feature-based routes** with lazy loading
- **Reactive services** with RxJS
- **Scoped SCSS** styling
- **HTTP interceptors** for API calls
- **Environment-based configuration**

---

## PHASE 4A: CORE INFRASTRUCTURE & ROUTING

### Task F1: Setup App Routes and Navigation

**Files to create:**
- Update: `frontend/src/app/app.routes.ts`
- Create: `frontend/src/app/layout/header/header.component.ts`
- Create: `frontend/src/app/layout/header/header.component.html`
- Create: `frontend/src/app/layout/header/header.component.scss`
- Create: `frontend/src/app/layout/sidebar/sidebar.component.ts`
- Create: `frontend/src/app/layout/sidebar/sidebar.component.html`
- Create: `frontend/src/app/layout/sidebar/sidebar.component.scss`
- Update: `frontend/src/app/app.component.ts`

**Step 1: Create Header Component**

```typescript
// frontend/src/app/layout/header/header.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  currentUser$ = this.authService.currentUser$;

  constructor(public authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
```

```html
<!-- frontend/src/app/layout/header/header.component.html -->
<header class="app-header">
  <div class="header-content">
    <h1 class="app-title">Syndata</h1>
    <nav class="header-nav">
      <span *ngIf="currentUser$ | async as user" class="user-info">
        {{ user.email }}
      </span>
      <button (click)="logout()" class="logout-btn">Logout</button>
    </nav>
  </div>
</header>
```

```scss
// frontend/src/app/layout/header/header.component.scss
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
  }

  .app-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .header-nav {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .user-info {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .logout-btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid white;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(255,255,255,0.3);
    }
  }
}
```

**Step 2: Create Sidebar Component**

```typescript
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
```

```html
<!-- frontend/src/app/layout/sidebar/sidebar.component.html -->
<aside class="sidebar">
  <nav class="nav-menu">
    <a *ngFor="let item of navItems"
       [routerLink]="item.route"
       [class.active]="isActive(item.route)"
       class="nav-item">
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </a>
  </nav>
</aside>
```

```scss
// frontend/src/app/layout/sidebar/sidebar.component.scss
.sidebar {
  width: 250px;
  background: #f5f7fa;
  border-right: 1px solid #e0e6ed;
  padding: 2rem 0;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  color: #333;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: #e8ecf1;
  }

  &.active {
    background: #667eea;
    color: white;
    font-weight: bold;
  }
}

.nav-icon {
  font-size: 1.2rem;
}

.nav-label {
  flex: 1;
}
```

**Step 3: Update App Routes**

```typescript
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
```

**Step 4: Create Main Layout Component**

```typescript
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
```

**Step 5: Update App Component**

```typescript
// frontend/src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {}
```

**Step 6: Commit**

```bash
cd frontend
git add src/app/layout/ src/app/app.routes.ts src/app/app.component.ts
git commit -m "feat: Add main layout with header, sidebar, and routing setup"
```

---

### Task F2: Create Shared API Service

**Files to create:**
- Create: `frontend/src/app/shared/services/api.service.ts`
- Create: `frontend/src/app/shared/services/index.ts`
- Create: `frontend/src/app/shared/models/api.models.ts`

**Step 1: Create API Models**

```typescript
// frontend/src/app/shared/models/api.models.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  datasets?: Dataset[];
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  schemaDefinition: any;
  createdAt: Date;
  elements?: Element[];
}

export interface Element {
  id: string;
  datasetId: string;
  name: string;
  type: string;
  definition: any;
  createdAt: Date;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  datasetId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  count: number;
  config: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface Record {
  id: string;
  projectId: string;
  generationJobId: string;
  data: any;
  isComposite: boolean;
  createdAt: Date;
}

export interface GenerateRequest {
  datasetId: string;
  count: number;
  rules?: any;
  compositionConfig?: any;
}
```

**Step 2: Create API Service**

```typescript
// frontend/src/app/shared/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Project, Dataset, Element, GenerationJob, Record, GenerateRequest
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Projects
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/projects/${id}`, project);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }

  // Datasets
  getDatasets(projectId: string): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(`${this.baseUrl}/projects/${projectId}/datasets`);
  }

  getDataset(projectId: string, datasetId: string): Observable<Dataset> {
    return this.http.get<Dataset>(`${this.baseUrl}/projects/${projectId}/datasets/${datasetId}`);
  }

  createDataset(projectId: string, dataset: Partial<Dataset>): Observable<Dataset> {
    return this.http.post<Dataset>(`${this.baseUrl}/projects/${projectId}/datasets`, dataset);
  }

  // Elements
  getElements(projectId: string, datasetId: string): Observable<Element[]> {
    return this.http.get<Element[]>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/elements`
    );
  }

  addElement(projectId: string, datasetId: string, element: Partial<Element>): Observable<Element> {
    return this.http.post<Element>(
      `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/elements`,
      element
    );
  }

  // Generation
  generateData(projectId: string, request: GenerateRequest): Observable<GenerationJob> {
    return this.http.post<GenerationJob>(`${this.baseUrl}/projects/${projectId}/generate`, request);
  }

  getGenerationJob(jobId: string): Observable<GenerationJob> {
    return this.http.get<GenerationJob>(`${this.baseUrl}/projects/:projectId/jobs/${jobId}`);
  }

  getGenerationJobs(projectId: string): Observable<GenerationJob[]> {
    return this.http.get<GenerationJob[]>(`${this.baseUrl}/projects/${projectId}/jobs`);
  }

  getRecords(projectId: string, jobId: string, skip = 0, take = 10): Observable<Record[]> {
    const params = new HttpParams()
      .set('jobId', jobId)
      .set('skip', skip.toString())
      .set('take', take.toString());
    return this.http.get<Record[]>(`${this.baseUrl}/projects/${projectId}/records`, { params });
  }

  getRecord(recordId: string): Observable<Record> {
    return this.http.get<Record>(`${this.baseUrl}/projects/:projectId/records/${recordId}`);
  }
}
```

**Step 3: Create Services Index**

```typescript
// frontend/src/app/shared/services/index.ts
export { ApiService } from './api.service';
```

**Step 4: Commit**

```bash
cd frontend
git add src/app/shared/services/ src/app/shared/models/
git commit -m "feat: Add shared API service and models for backend integration"
```

---

## PHASE 4B: FEATURE COMPONENTS

### Task F3: Create Project Management Pages

**Files to create:**
- Create: `frontend/src/app/features/projects/projects-list.component.ts`
- Create: `frontend/src/app/features/projects/projects-list.component.html`
- Create: `frontend/src/app/features/projects/projects-list.component.scss`
- Create: `frontend/src/app/features/projects/project-detail.component.ts`
- Create: `frontend/src/app/features/projects/project-detail.component.html`
- Create: `frontend/src/app/features/projects/project-detail.component.scss`
- Create: `frontend/src/app/features/projects/project-form.component.ts`

(Continue with detailed component code...)

---

## Implementation Commands

All tasks include exact code to copy/paste with tests where applicable. Follow the pattern:
1. Create files with exact code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Commit after each task

---

## Success Criteria for Phase 4

✅ All 6 feature pages functional
✅ Full CRUD operations for projects, datasets, elements
✅ Generation job triggering and monitoring
✅ Results exploration and viewing
✅ Export functionality
✅ Responsive design
✅ Integrated with backend API
✅ No console errors
✅ All routes working
