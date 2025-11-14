// backend/src/features/generation/services/simple-data-generator.service.ts
import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class SimpleDataGeneratorService {
  generateValue(
    field: any,
    rules?: any,
    distribution?: any,
  ): { value: any; source: string; confidence: number } {
    const fieldRule = rules && rules[field.name];

    // If there's a specific rule, use it
    if (fieldRule) {
      if (fieldRule.generate === 'sequential') {
        return { value: this.getSequentialValue(field), source: 'sequential_rule', confidence: 0.99 };
      }

      if (fieldRule.generate === 'from_pattern' && distribution) {
        return { value: this.generateFromPattern(field, distribution), source: 'pattern_rule', confidence: 0.95 };
      }

      if (fieldRule.value !== undefined) {
        return { value: fieldRule.value, source: 'fixed_rule', confidence: 1.0 };
      }

      if (fieldRule.distribution) {
        return {
          value: this.generateFromDistribution(field, fieldRule.distribution),
          source: 'distribution_rule',
          confidence: 0.9,
        };
      }
    }

    // Fall back to type-based generation
    return this.generateByType(field, distribution);
  }

  private getSequentialValue(field: any): any {
    // For MVP, just generate UUID
    return faker.string.uuid();
  }

  private generateFromPattern(field: any, distribution: any): any {
    if (field.type === 'email') {
      return faker.internet.email();
    }

    if (field.type === 'string' && distribution) {
      return faker.word.words({ count: 1 });
    }

    return '';
  }

  private generateFromDistribution(field: any, distribution: any): any {
    if (field.type === 'number') {
      const { mean, stddev } = distribution;
      if (mean !== undefined && stddev !== undefined) {
        return this.generateNormal(mean, stddev);
      }
      return faker.number.int({ min: 0, max: 100 });
    }

    return faker.datatype.boolean();
  }

  private generateByType(field: any, _distribution?: any): { value: any; source: string; confidence: number } {
    switch (field.type) {
      case 'string':
        return {
          value: faker.word.words({ count: 1 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'number':
        return {
          value: faker.number.int({ min: 0, max: 100 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'email':
        return {
          value: faker.internet.email(),
          source: 'type_based',
          confidence: 0.8,
        };
      case 'date':
        return {
          value: faker.date.past().toISOString(),
          source: 'type_based',
          confidence: 0.8,
        };
      case 'boolean':
        return {
          value: faker.datatype.boolean(),
          source: 'type_based',
          confidence: 0.9,
        };
      default:
        return {
          value: faker.word.words({ count: 1 }),
          source: 'default',
          confidence: 0.5,
        };
    }
  }

  private generateNormal(mean: number, stddev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(mean + stddev * z0);
  }

  generateRecord(
    schema: any,
    rules?: any,
    distributions?: any,
  ): { record: any; sources: any } {
    const record: any = {};
    const sources: any = {};

    schema.fields.forEach((field: any) => {
      const { value, source, confidence } = this.generateValue(
        field,
        rules,
        distributions && distributions[field.name],
      );

      record[field.name] = value;
      sources[field.name] = { source, confidence };
    });

    return { record, sources };
  }
}
