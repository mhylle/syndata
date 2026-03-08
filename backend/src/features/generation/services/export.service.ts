import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RecordEntity } from '../../../shared/entities/record.entity';
import { AnnotationEntity } from '../../../shared/entities/annotation.entity';
import { GenerationJobEntity } from '../../../shared/entities/generation-job.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(AnnotationEntity)
    private annotationRepository: Repository<AnnotationEntity>,
    @InjectRepository(GenerationJobEntity)
    private jobRepository: Repository<GenerationJobEntity>,
  ) {}

  async exportRecords(
    projectId: string,
    options: {
      format: 'json' | 'csv';
      jobIds?: string[];
      includeAnnotations?: boolean;
      fields?: string[];
    },
  ): Promise<{ content: string; contentType: string; filename: string }> {
    // Build query for records
    const where: any = { projectId };
    if (options.jobIds?.length) {
      // Verify jobs exist and belong to the project
      const jobs = await this.jobRepository.find({
        where: { id: In(options.jobIds), projectId },
      });
      if (jobs.length !== options.jobIds.length) {
        throw new NotFoundException('One or more job IDs not found for this project');
      }
      where.generationJobId = In(options.jobIds);
    }

    const records = await this.recordRepository.find({
      where,
      relations: options.includeAnnotations ? ['fieldValues'] : [],
      order: { createdAt: 'ASC' },
    });

    // Fetch annotations if requested
    let annotationsByTarget: Map<string, AnnotationEntity[]> = new Map();
    if (options.includeAnnotations && records.length > 0) {
      const recordIds = records.map(r => r.id);
      const annotations = await this.annotationRepository.find({
        where: { targetId: In(recordIds) },
      });
      for (const ann of annotations) {
        const list = annotationsByTarget.get(ann.targetId) || [];
        list.push(ann);
        annotationsByTarget.set(ann.targetId, list);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (options.format === 'csv') {
      const content = this.toCSV(records, annotationsByTarget, options.fields);
      return {
        content,
        contentType: 'text/csv',
        filename: `syndata-export-${timestamp}.csv`,
      };
    }

    const content = this.toJSON(records, annotationsByTarget, options.fields);
    return {
      content,
      contentType: 'application/json',
      filename: `syndata-export-${timestamp}.json`,
    };
  }

  private toJSON(
    records: RecordEntity[],
    annotations: Map<string, AnnotationEntity[]>,
    fields?: string[],
  ): string {
    const output = records.map(record => {
      let data = record.data;
      if (fields?.length) {
        data = this.filterFields(data, fields);
      }

      const entry: any = {
        id: record.id,
        data,
        isComposite: record.isComposite,
        createdAt: record.createdAt,
      };

      const recordAnnotations = annotations.get(record.id);
      if (recordAnnotations?.length) {
        entry.annotations = recordAnnotations.map(a => ({
          type: a.annotationType,
          value: a.value,
          targetType: a.targetType,
        }));
      }

      return entry;
    });

    return JSON.stringify(output, null, 2);
  }

  private toCSV(
    records: RecordEntity[],
    annotations: Map<string, AnnotationEntity[]>,
    fields?: string[],
  ): string {
    if (records.length === 0) return '';

    // Collect all field names from all records' data
    const allFields = new Set<string>();
    for (const record of records) {
      this.collectFieldNames(record.data, '', allFields);
    }

    let headers = Array.from(allFields).sort();
    if (fields?.length) {
      headers = headers.filter(h => fields.some(f => h === f || h.startsWith(f + '.')));
    }

    const includeAnnotations = annotations.size > 0;

    // Build header row
    const headerRow = ['id', ...headers];
    if (includeAnnotations) {
      headerRow.push('annotations');
    }

    const rows: string[] = [headerRow.map(h => this.csvEscape(h)).join(',')];

    // Build data rows
    for (const record of records) {
      const values: string[] = [record.id];
      for (const header of headers) {
        const value = this.getNestedValue(record.data, header);
        values.push(this.csvEscape(String(value ?? '')));
      }
      if (includeAnnotations) {
        const recordAnnotations = annotations.get(record.id) || [];
        const annStr = recordAnnotations
          .map(a => `${a.annotationType}=${a.value}`)
          .join('; ');
        values.push(this.csvEscape(annStr));
      }
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  private collectFieldNames(obj: any, prefix: string, fields: Set<string>): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.collectFieldNames(value, fullKey, fields);
      } else {
        fields.add(fullKey);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private filterFields(data: any, fields: string[]): any {
    if (typeof data !== 'object' || data === null) return data;

    const filtered: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (fields.includes(key)) {
        filtered[key] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedFields = fields
          .filter(f => f.startsWith(key + '.'))
          .map(f => f.slice(key.length + 1));
        if (nestedFields.length > 0) {
          filtered[key] = this.filterFields(value, nestedFields);
        }
      }
    }
    return filtered;
  }
}
