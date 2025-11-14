import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Project } from '../../shared/models/api.models';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent {
  @Output() onSubmit = new EventEmitter<Partial<Project>>();

  form = {
    name: '',
    description: ''
  };

  submit(): void {
    if (!this.form.name.trim()) {
      alert('Project name is required');
      return;
    }

    this.onSubmit.emit({
      name: this.form.name,
      description: this.form.description
    });

    this.form = { name: '', description: '' };
  }
}
