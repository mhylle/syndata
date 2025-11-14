import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Project } from '../../shared/models/api.models';
import { ProjectFormComponent } from './project-form.component';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ProjectFormComponent],
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss']
})
export class ProjectsListComponent implements OnInit {
  projects: Project[] = [];
  loading = false;
  error: string | null = null;
  showForm = false;
  searchText = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;
    this.apiService.getProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load projects';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onCreateProject(project: Partial<Project>): void {
    this.apiService.createProject(project).subscribe({
      next: () => {
        this.showForm = false;
        this.loadProjects();
      },
      error: (err) => {
        this.error = 'Failed to create project';
        console.error(err);
      }
    });
  }

  deleteProject(id: string): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.apiService.deleteProject(id).subscribe({
        next: () => this.loadProjects(),
        error: (err) => {
          this.error = 'Failed to delete project';
          console.error(err);
        }
      });
    }
  }

  get filteredProjects(): Project[] {
    if (!this.searchText) return this.projects;
    return this.projects.filter(p =>
      p.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
      p.description?.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
}
