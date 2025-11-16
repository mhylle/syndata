import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import {
  SyntheticSchemaDto,
  ClarifyingQuestion,
  SchemaComponent
} from '../../shared/models/api.models';

@Component({
  selector: 'app-ai-schema-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-schema-generator.component.html',
  styleUrls: ['./ai-schema-generator.component.scss']
})
export class AISchemaGeneratorComponent {
  @Input() projectId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() schemaCreated = new EventEmitter<SyntheticSchemaDto>();

  currentStep: 'description' | 'questions' | 'review' = 'description';
  loading = false;
  error: string | null = null;

  // Step 1: Description form
  description = '';
  businessContext = '';
  targetRecordCount: number | null = null;
  domainExpertise = '';

  // Step 2: Questions
  clarifyingQuestions: ClarifyingQuestion[] = [];
  answers: Map<string, any> = new Map();
  conversationId = '';

  // Step 3: Review
  schema: SyntheticSchemaDto | null = null;
  minConfidence = 0;
  filteredComponents: SchemaComponent[] = [];

  startConversation(): void {
    if (!this.description.trim()) {
      this.error = 'Description is required';
      return;
    }

    this.loading = true;
    this.error = null;

    this.apiService.generateSchema(this.projectId, {
      description: this.description,
      businessContext: this.businessContext || undefined,
      targetRecordCount: this.targetRecordCount || undefined,
      domainExpertise: this.domainExpertise || undefined
    }).subscribe({
      next: (response) => {
        console.log('AI Schema Response:', response);

        if (!response) {
          this.error = 'Received empty response from server';
          this.loading = false;
          return;
        }

        this.conversationId = response.conversationId;
        this.clarifyingQuestions = response.clarifyingQuestions || [];

        console.log('Clarifying questions:', this.clarifyingQuestions);

        // Initialize answers map
        this.answers.clear();
        if (Array.isArray(this.clarifyingQuestions)) {
          this.clarifyingQuestions.forEach(q => {
            if (q.questionType === 'numeric') {
              this.answers.set(q.questionId, 0);
            } else {
              this.answers.set(q.questionId, '');
            }
          });
        }

        this.currentStep = 'questions';
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to start conversation. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  refineSchema(): void {
    this.loading = true;
    this.error = null;

    // Convert Map to object
    const answersObj: { [key: string]: any } = {};
    this.answers.forEach((value, key) => {
      answersObj[key] = value;
    });

    this.apiService.refineSchema(this.projectId, this.conversationId, {
      answers: answersObj
    }).subscribe({
      next: (response) => {
        this.schema = response.schema;
        this.filteredComponents = this.schema.components;
        this.currentStep = 'review';
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to generate schema. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  createDataset(): void {
    if (this.schema) {
      this.schemaCreated.emit(this.schema);
    }
  }

  regenerate(): void {
    this.currentStep = 'description';
    this.description = '';
    this.businessContext = '';
    this.targetRecordCount = null;
    this.domainExpertise = '';
    this.clarifyingQuestions = [];
    this.answers.clear();
    this.schema = null;
    this.conversationId = '';
    this.error = null;
  }

  onClose(): void {
    this.close.emit();
  }

  goBack(): void {
    if (this.currentStep === 'questions') {
      this.currentStep = 'description';
    } else if (this.currentStep === 'review') {
      this.currentStep = 'questions';
    }
  }

  onConfidenceChange(): void {
    if (this.schema) {
      this.filteredComponents = this.schema.components.filter(
        c => c.confidence >= this.minConfidence
      );
    }
  }

  getAnswerValue(questionId: string): any {
    return this.answers.get(questionId);
  }

  setAnswerValue(questionId: string, value: any): void {
    this.answers.set(questionId, value);
  }

  constructor(private apiService: ApiService) {}
}
