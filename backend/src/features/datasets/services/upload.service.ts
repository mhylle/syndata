import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExampleDataEntity } from '../../../shared/entities/example-data.entity';
import { PatternAnalyzerService } from '../../generation/services/pattern-analyzer.service';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(ExampleDataEntity)
    private exampleRepository: Repository<ExampleDataEntity>,
    private patternAnalyzer: PatternAnalyzerService,
  ) {}

  parseCSV(content: string): Record<string, any>[] {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = this.parseCSVLine(lines[0]);
    const records: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const record: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = this.coerceValue(values[j]);
      }
      records.push(record);
    }

    return records;
  }

  parseJSON(content: string): Record<string, any>[] {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON must be an array of objects');
    }
    if (parsed.length === 0) {
      throw new BadRequestException('JSON array must not be empty');
    }
    if (typeof parsed[0] !== 'object' || parsed[0] === null) {
      throw new BadRequestException('JSON array must contain objects');
    }
    return parsed;
  }

  detectSchema(records: Record<string, any>[]): any {
    if (!records.length) {
      throw new BadRequestException('No records to analyze');
    }

    const fieldNames = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        fieldNames.add(key);
      }
    }

    const fields = Array.from(fieldNames).map(name => {
      const values = records.map(r => r[name]).filter(v => v !== null && v !== undefined);
      const type = this.detectType(values);
      const constraints = this.detectConstraints(values, type);

      return { name, type, constraints };
    });

    return { fields };
  }

  analyzePatterns(records: Record<string, any>[], schema: any): any {
    const analysis: Record<string, any> = {};

    for (const field of schema.fields) {
      const values = records.map(r => r[field.name]).filter(v => v !== null && v !== undefined);

      if (field.type === 'number') {
        const numValues = values.map(Number).filter(n => !isNaN(n));
        analysis[field.name] = {
          type: 'numeric',
          ...this.patternAnalyzer.analyzeFieldDistribution(numValues),
        };
      } else if (field.type === 'string') {
        const strValues = values.map(String);
        const uniqueRatio = new Set(strValues).size / strValues.length;

        analysis[field.name] = {
          type: 'string',
          ...this.patternAnalyzer.analyzeStringPatterns(strValues),
          uniqueValues: new Set(strValues).size,
          uniqueRatio: Math.round(uniqueRatio * 100) / 100,
          isLikelyEnum: uniqueRatio < 0.1 && new Set(strValues).size <= 20,
          enumValues: uniqueRatio < 0.1 ? Array.from(new Set(strValues)) : undefined,
        };
      } else if (field.type === 'boolean') {
        const trueCount = values.filter(v => v === true || v === 'true').length;
        analysis[field.name] = {
          type: 'boolean',
          trueRatio: Math.round((trueCount / values.length) * 100) / 100,
          count: values.length,
        };
      } else if (field.type === 'date') {
        analysis[field.name] = {
          type: 'date',
          count: values.length,
          samples: values.slice(0, 3),
        };
      }
    }

    return analysis;
  }

  async storeExamples(
    datasetId: string,
    records: Record<string, any>[],
    format: string,
    filename?: string,
  ): Promise<ExampleDataEntity> {
    const example = this.exampleRepository.create({
      datasetId,
      data: records,
      originalFormat: format,
      originalFilename: filename,
      rowCount: records.length,
    });
    return this.exampleRepository.save(example);
  }

  async getExamples(datasetId: string): Promise<ExampleDataEntity[]> {
    return this.exampleRepository.find({ where: { datasetId } });
  }

  async deleteExample(exampleId: string): Promise<void> {
    const result = await this.exampleRepository.delete(exampleId);
    if (result.affected === 0) {
      throw new NotFoundException(`Example ${exampleId} not found`);
    }
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private coerceValue(value: string): any {
    if (value === '' || value === 'null' || value === 'NULL') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') return num;
    return value;
  }

  private detectType(values: any[]): string {
    if (values.length === 0) return 'string';

    const types = values.map(v => {
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'number') return 'number';
      if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
        if (/^[^@]+@[^@]+\.[^@]+$/.test(v)) return 'email';
      }
      return 'string';
    });

    // Return the most common type
    const counts: Record<string, number> = {};
    for (const t of types) {
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  private detectConstraints(values: any[], type: string): any {
    const constraints: any = {};

    if (type === 'number') {
      const nums = values.map(Number).filter(n => !isNaN(n));
      if (nums.length) {
        constraints.min = Math.min(...nums);
        constraints.max = Math.max(...nums);
      }
    } else if (type === 'string') {
      const strs = values.map(String);
      const unique = new Set(strs);
      if (unique.size <= 20 && unique.size / strs.length < 0.1) {
        constraints.enum = Array.from(unique);
      }
    }

    return constraints;
  }
}
