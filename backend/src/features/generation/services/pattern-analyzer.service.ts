// backend/src/features/generation/services/pattern-analyzer.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PatternAnalyzerService {
  analyzeFieldDistribution(values: any[]): any {
    if (!values || values.length === 0) {
      return null;
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;

    // Calculate mean
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Calculate standard deviation
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    // Calculate quartiles
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    return {
      min: sortedValues[0],
      max: sortedValues[n - 1],
      mean: Math.round(mean * 100) / 100,
      median: sortedValues[q2Index],
      stddev: Math.round(stddev * 100) / 100,
      q1: sortedValues[q1Index],
      q3: sortedValues[q3Index],
      count: n,
    };
  }

  analyzeStringPatterns(values: string[]): any {
    if (!values || values.length === 0) {
      return null;
    }

    const lengths = values.map((v) => v.length);
    const distribution = this.analyzeFieldDistribution(lengths);

    return {
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      avgLength: Math.round(
        (lengths.reduce((a, b) => a + b, 0) / lengths.length) * 100,
      ) / 100,
      distribution,
      samples: values.slice(0, 5),
    };
  }

  detectFieldRelationships(records: any[], schema: any): Map<string, any> {
    const relationships = new Map();

    if (!records || records.length < 2) {
      return relationships;
    }

    // Simple relationship detection: fields that are frequently non-null together
    const fields = schema.fields.map((f: any) => f.name);

    fields.forEach((fieldA) => {
      fields.forEach((fieldB) => {
        if (fieldA !== fieldB) {
          const coOccurrence = records.filter(
            (r) => r[fieldA] !== null && r[fieldB] !== null,
          ).length;
          const correlation =
            (coOccurrence / records.length) * 100;

          if (correlation > 75) {
            const key = `${fieldA}->${fieldB}`;
            relationships.set(key, { correlation });
          }
        }
      });
    });

    return relationships;
  }
}
