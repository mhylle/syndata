import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Dataset, Element } from '../../shared/models/api.models';
import { DataGenerationConfigComponent } from './data-generation-config.component';

export interface LlmOptions {
  outputFormat?: 'single_value' | 'sentence' | 'paragraph' | 'list' | 'structured' | 'custom';
  maxLength?: number;        // max tokens for LLM response
  temperature?: number;      // 0.1 - 1.0
  examples?: string[];       // few-shot examples
  constraints?: string;      // things to include/avoid
  negativePrompt?: string;   // things to explicitly exclude from output
  customFormat?: string;     // free-text format instruction (used when outputFormat === 'custom')
  structuredKeys?: string;   // comma-separated keys for structured output (e.g. "systolic,diastolic,pulse")
}

export interface SchemaField {
  name: string;
  type: string;
  min?: number;
  max?: number;
  values?: string[];
  pattern?: string;
  faker?: string;
  description?: string;
  generator?: string;  // 'llm' for LLM-generated fields
  prompt?: string;     // custom prompt template for LLM generation
  llmOptions?: LlmOptions;
}

const FIELD_TYPES = [
  'string', 'number', 'boolean', 'date', 'email', 'enum', 'uuid', 'integer', 'float'
];

@Component({
  selector: 'app-dataset-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DataGenerationConfigComponent],
  templateUrl: './dataset-detail.component.html',
  styleUrls: ['./dataset-detail.component.scss']
})
export class DatasetDetailComponent implements OnInit {
  dataset: Dataset | null = null;
  elements: Element[] = [];
  loading = false;
  error: string | null = null;
  projectId = '';
  datasetId = '';
  showGenerateModal = false;

  // Schema editing
  editingSchema = false;
  schemaFields: SchemaField[] = [];
  showJsonView = false;
  schemaJsonText = '';
  schemaJsonError: string | null = null;
  savingSchema = false;

  // New field being added
  showAddField = false;
  newField: SchemaField = { name: '', type: 'string' };
  newFieldEnumValues = '';

  // Field being edited inline
  editingFieldIndex: number | null = null;
  editField: SchemaField = { name: '', type: 'string' };
  editFieldEnumValues = '';

  // LLM output format options
  outputFormats = [
    { value: '', label: 'Auto (let LLM decide)' },
    { value: 'single_value', label: 'Single value (e.g. 120/80)' },
    { value: 'sentence', label: 'One sentence' },
    { value: 'paragraph', label: 'Paragraph (2-4 sentences)' },
    { value: 'list', label: 'Bullet list' },
    { value: 'structured', label: 'Structured (key: value pairs)' },
    { value: 'custom', label: 'Custom format' },
  ];

  // AI prompt improvement
  improvingField: string | null = null; // tracks which field is being improved e.g. 'edit-prompt', 'new-negativePrompt'

  // Element adding
  showAddElement = false;
  newElement = { name: '', type: 'string', faker: '', description: '' };

  // Element editing
  editingElementId: string | null = null;
  editElementDef: any = {};

  fieldTypes = FIELD_TYPES;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.datasetId = this.route.snapshot.paramMap.get('id') || '';
    const parent = this.route.parent;
    if (parent) {
      this.projectId = parent.snapshot.paramMap.get('projectId') || '';
    }
    this.loadDataset();
  }

  loadDataset(): void {
    if (!this.datasetId) return;
    this.loading = true;
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        if (projects.length > 0) {
          this.projectId = projects[0].id;
          this.apiService.getDataset(this.projectId, this.datasetId).subscribe({
            next: (dataset) => {
              this.dataset = dataset;
              this.syncFieldsFromSchema();
              this.loadElements();
            },
            error: () => {
              this.error = 'Failed to load dataset';
              this.loading = false;
            }
          });
        }
      }
    });
  }

  loadElements(): void {
    this.apiService.getElements(this.projectId, this.datasetId).subscribe({
      next: (elements) => {
        this.elements = elements;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load elements';
        this.loading = false;
      }
    });
  }

  // === Schema field helpers ===

  syncFieldsFromSchema(): void {
    const schema = this.dataset?.schemaDefinition;
    if (schema?.fields && Array.isArray(schema.fields)) {
      this.schemaFields = schema.fields.map((f: any) => ({ ...f }));
    } else {
      this.schemaFields = [];
    }
  }

  buildSchemaFromFields(): any {
    return {
      fields: this.schemaFields.map(f => {
        const field: any = { name: f.name, type: f.type };
        if (f.type === 'number' || f.type === 'integer' || f.type === 'float') {
          if (f.min !== undefined && f.min !== null) field.min = f.min;
          if (f.max !== undefined && f.max !== null) field.max = f.max;
        }
        if (f.type === 'enum' && f.values?.length) field.values = f.values;
        if (f.pattern) field.pattern = f.pattern;
        if (f.faker) field.faker = f.faker;
        if (f.description) field.description = f.description;
        if (f.generator) field.generator = f.generator;
        if (f.prompt) field.prompt = f.prompt;
        if (f.llmOptions) {
          const opts: any = {};
          if (f.llmOptions.outputFormat) opts.outputFormat = f.llmOptions.outputFormat;
          if (f.llmOptions.maxLength) opts.maxLength = f.llmOptions.maxLength;
          if (f.llmOptions.temperature !== undefined && f.llmOptions.temperature !== null) opts.temperature = f.llmOptions.temperature;
          if (f.llmOptions.examples?.length) opts.examples = f.llmOptions.examples;
          if (f.llmOptions.constraints) opts.constraints = f.llmOptions.constraints;
          if (f.llmOptions.negativePrompt) opts.negativePrompt = f.llmOptions.negativePrompt;
          if (f.llmOptions.customFormat) opts.customFormat = f.llmOptions.customFormat;
          if (f.llmOptions.structuredKeys) opts.structuredKeys = f.llmOptions.structuredKeys;
          if (Object.keys(opts).length > 0) field.llmOptions = opts;
        }
        return field;
      })
    };
  }

  hasAISchema(): boolean {
    if (!this.dataset?.schemaDefinition) return false;
    const schema = this.dataset.schemaDefinition;
    return !!(schema.schemaMetadata && schema.rootStructure);
  }

  hasGeneratableSchema(): boolean {
    if (!this.dataset?.schemaDefinition) return false;
    const schema = this.dataset.schemaDefinition;
    return !!(schema.schemaMetadata && schema.rootStructure) ||
           !!(schema.fields && Array.isArray(schema.fields) && schema.fields.length > 0);
  }

  hasSchemaContent(): boolean {
    return this.schemaFields.length > 0;
  }

  // === Schema editing ===

  startEditSchema(): void {
    this.editingSchema = true;
    this.syncFieldsFromSchema();
    this.showJsonView = false;
    this.editingFieldIndex = null;
    this.showAddField = false;
  }

  cancelEditSchema(): void {
    this.editingSchema = false;
    this.syncFieldsFromSchema();
    this.schemaJsonError = null;
  }

  saveSchema(): void {
    if (this.savingSchema) return;

    // Auto-apply any pending inline edit before saving
    if (this.editingFieldIndex !== null && this.editField.name?.trim()) {
      this.confirmEditField();
    }

    this.savingSchema = true;

    let schema: any;
    if (this.showJsonView) {
      try {
        schema = JSON.parse(this.schemaJsonText);
      } catch {
        this.schemaJsonError = 'Invalid JSON';
        this.savingSchema = false;
        return;
      }
    } else {
      schema = this.buildSchemaFromFields();
    }

    this.apiService.updateDataset(this.projectId, this.datasetId, { schemaDefinition: schema }).subscribe({
      next: (updated) => {
        this.dataset = updated;
        this.syncFieldsFromSchema();
        this.editingSchema = false;
        this.savingSchema = false;
        this.schemaJsonError = null;
      },
      error: () => {
        this.schemaJsonError = 'Failed to save schema.';
        this.savingSchema = false;
      }
    });
  }

  // === JSON toggle ===

  toggleJsonView(): void {
    if (!this.showJsonView) {
      // Switching TO json: serialize current fields
      this.schemaJsonText = JSON.stringify(this.buildSchemaFromFields(), null, 2);
      this.schemaJsonError = null;
    } else {
      // Switching FROM json: parse back into fields
      try {
        const parsed = JSON.parse(this.schemaJsonText);
        if (parsed?.fields && Array.isArray(parsed.fields)) {
          this.schemaFields = parsed.fields.map((f: any) => ({ ...f }));
        }
        this.schemaJsonError = null;
      } catch {
        this.schemaJsonError = 'Invalid JSON - fix before switching to visual editor';
        return;
      }
    }
    this.showJsonView = !this.showJsonView;
  }

  validateJson(): void {
    try {
      JSON.parse(this.schemaJsonText);
      this.schemaJsonError = null;
    } catch (e: any) {
      this.schemaJsonError = `Invalid JSON: ${e.message}`;
    }
  }

  // === Add field ===

  openAddField(): void {
    this.showAddField = true;
    this.newField = { name: '', type: 'string', llmOptions: { examples: [] } };
    this.newFieldEnumValues = '';
    this.editingFieldIndex = null;
  }

  cancelAddField(): void {
    this.showAddField = false;
  }

  confirmAddField(): void {
    if (!this.newField.name.trim()) return;
    const field: SchemaField = {
      name: this.newField.name.trim(),
      type: this.newField.type,
    };
    this.applyFieldExtras(field, this.newField, this.newFieldEnumValues);
    this.schemaFields.push(field);
    this.showAddField = false;
  }

  // === Edit field inline ===

  startEditField(index: number): void {
    this.editingFieldIndex = index;
    const src = this.schemaFields[index];
    this.editField = {
      ...src,
      llmOptions: src.llmOptions ? {
        ...src.llmOptions,
        examples: src.llmOptions.examples ? [...src.llmOptions.examples] : [],
      } : { examples: [] },
    };
    this.editFieldEnumValues = (this.editField.values || []).join(', ');
    this.showAddField = false;
  }

  cancelEditField(): void {
    this.editingFieldIndex = null;
  }

  confirmEditField(): void {
    if (this.editingFieldIndex === null || !this.editField.name.trim()) return;
    const field: SchemaField = {
      name: this.editField.name.trim(),
      type: this.editField.type,
    };
    this.applyFieldExtras(field, this.editField, this.editFieldEnumValues);
    this.schemaFields[this.editingFieldIndex] = field;
    this.editingFieldIndex = null;
  }

  removeField(index: number): void {
    this.schemaFields.splice(index, 1);
    if (this.editingFieldIndex === index) {
      this.editingFieldIndex = null;
    }
  }

  moveField(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.schemaFields.length) return;
    const temp = this.schemaFields[index];
    this.schemaFields[index] = this.schemaFields[target];
    this.schemaFields[target] = temp;
  }

  private applyFieldExtras(target: SchemaField, source: SchemaField, enumValuesStr: string): void {
    if (source.type === 'number' || source.type === 'integer' || source.type === 'float') {
      if (source.min !== undefined && source.min !== null) target.min = Number(source.min);
      if (source.max !== undefined && source.max !== null) target.max = Number(source.max);
    }
    if (source.type === 'enum') {
      target.values = enumValuesStr
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    }
    if (source.faker) target.faker = source.faker;
    if (source.description) target.description = source.description;
    if (source.pattern) target.pattern = source.pattern;
    if (source.generator) target.generator = source.generator;
    if (source.prompt) target.prompt = source.prompt;
    if (source.llmOptions) target.llmOptions = { ...source.llmOptions };
  }

  // === LLM options helpers ===

  ensureLlmOptions(field: SchemaField): LlmOptions {
    if (!field.llmOptions) field.llmOptions = { examples: [] };
    if (!field.llmOptions.examples) field.llmOptions.examples = [];
    return field.llmOptions;
  }

  addExample(field: SchemaField): void {
    this.ensureLlmOptions(field).examples!.push('');
  }

  removeExample(field: SchemaField, index: number): void {
    this.ensureLlmOptions(field).examples!.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  improveWithAI(field: SchemaField, fieldType: 'prompt' | 'description' | 'negativePrompt', prefix: string): void {
    const text = fieldType === 'prompt' ? field.prompt
      : fieldType === 'description' ? field.description
      : field.llmOptions?.negativePrompt;

    if (!text?.trim()) return;

    const key = `${prefix}-${fieldType}`;
    this.improvingField = key;

    const schemaFields = this.schemaFields.map(f => f.name);

    this.apiService.improvePrompt(this.projectId, {
      text,
      fieldType,
      fieldName: field.name,
      schemaFields,
    }).subscribe({
      next: (res) => {
        if (fieldType === 'prompt') field.prompt = res.improved;
        else if (fieldType === 'description') field.description = res.improved;
        else if (fieldType === 'negativePrompt') this.ensureLlmOptions(field).negativePrompt = res.improved;
        this.improvingField = null;
      },
      error: () => {
        this.improvingField = null;
      },
    });
  }

  isNumericType(type: string): boolean {
    return type === 'number' || type === 'integer' || type === 'float';
  }

  getFieldSummary(field: SchemaField): string {
    const parts: string[] = [];
    if (this.isNumericType(field.type)) {
      if (field.min !== undefined && field.max !== undefined) {
        parts.push(`${field.min} - ${field.max}`);
      } else if (field.min !== undefined) {
        parts.push(`min: ${field.min}`);
      } else if (field.max !== undefined) {
        parts.push(`max: ${field.max}`);
      }
    }
    if (field.type === 'enum' && field.values?.length) {
      parts.push(field.values.join(', '));
    }
    if (field.generator === 'llm') {
      const llmParts = ['LLM'];
      if (field.llmOptions?.outputFormat) llmParts.push(field.llmOptions.outputFormat);
      if (field.llmOptions?.examples?.length) llmParts.push(`${field.llmOptions.examples.length} examples`);
      parts.push(llmParts.join(', '));
    }
    if (field.faker) parts.push(`faker: ${field.faker}`);
    if (field.pattern) parts.push(`pattern: ${field.pattern}`);
    return parts.join(' | ');
  }

  // === Element management ===

  toggleAddElement(): void {
    this.showAddElement = !this.showAddElement;
    if (this.showAddElement) {
      this.newElement = { name: '', type: 'string', faker: '', description: '' };
      this.editingElementId = null;
    }
  }

  addElement(): void {
    if (!this.newElement.name.trim()) return;
    const definition: any = {};
    if (this.newElement.faker) definition.faker = this.newElement.faker;
    if (this.newElement.description) definition.description = this.newElement.description;

    this.apiService.addElement(this.projectId, this.datasetId, {
      name: this.newElement.name.trim(),
      type: this.newElement.type,
      definition
    }).subscribe({
      next: () => {
        this.showAddElement = false;
        this.loadElements();
      },
      error: () => {
        this.error = 'Failed to add element.';
      }
    });
  }

  getElementDefSummary(element: Element): string[] {
    if (!element.definition) return [];
    const items: string[] = [];
    for (const [key, value] of Object.entries(element.definition)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        items.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        items.push(`${key}: [${(value as any[]).join(', ')}]`);
      }
    }
    return items;
  }

  // === Generation ===

  openGenerateModal(): void {
    this.showGenerateModal = true;
  }

  closeGenerateModal(): void {
    this.showGenerateModal = false;
  }

  onGenerationComplete(): void {
    this.showGenerateModal = false;
    this.loadDataset();
  }

  deleteDataset(): void {
    if (!this.dataset || !confirm(`Delete "${this.dataset.name}" and all its generated data? This cannot be undone.`)) {
      return;
    }
    this.apiService.deleteDataset(this.projectId, this.datasetId).subscribe({
      next: () => this.router.navigate(['/datasets']),
      error: () => this.error = 'Failed to delete dataset',
    });
  }
}
