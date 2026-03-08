import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: any;
  defaultRules: any;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  fieldCount: number;
}

@Injectable()
export class TemplateService {
  private templates: Map<string, SchemaTemplate> = new Map();
  private readonly templatesDir = path.join(__dirname, '..', 'templates');

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const files = fs.readdirSync(this.templatesDir).filter(f => f.endsWith('.template.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.templatesDir, file), 'utf-8');
      const template: SchemaTemplate = JSON.parse(content);
      this.templates.set(template.id, template);
    }
  }

  listTemplates(): TemplateSummary[] {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      fieldCount: t.schema.fields?.length || 0,
    }));
  }

  getTemplate(templateId: string): SchemaTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template '${templateId}' not found`);
    }
    return template;
  }
}
