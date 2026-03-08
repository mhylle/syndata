// backend/src/features/generation/services/simple-data-generator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { OllamaService } from './ollama.service';

@Injectable()
export class SimpleDataGeneratorService {
  private readonly logger = new Logger(SimpleDataGeneratorService.name);

  constructor(private readonly ollamaService: OllamaService) {}

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
    // If a faker generator is specified, use it
    if (field.faker) {
      try {
        const value = this.resolveFaker(field.faker);
        if (value !== undefined) {
          return { value, source: 'faker', confidence: 0.85 };
        }
      } catch { /* fall through to type-based */ }
    }

    switch (field.type) {
      case 'string':
        return {
          value: faker.word.words({ count: 1 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'number':
      case 'float':
        return {
          value: field.type === 'float'
            ? faker.number.float({ min: field.min ?? 0, max: field.max ?? 100, fractionDigits: 2 })
            : faker.number.int({ min: field.min ?? 0, max: field.max ?? 100 }),
          source: 'type_based',
          confidence: 0.7,
        };
      case 'integer':
        return {
          value: faker.number.int({ min: field.min ?? 0, max: field.max ?? 100 }),
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
      case 'enum':
        if (field.values && field.values.length > 0) {
          return {
            value: field.values[Math.floor(Math.random() * field.values.length)],
            source: 'enum_random',
            confidence: 0.95,
          };
        }
        return { value: null, source: 'enum_empty', confidence: 0 };
      case 'uuid':
        return {
          value: faker.string.uuid(),
          source: 'type_based',
          confidence: 0.95,
        };
      default:
        return {
          value: faker.word.words({ count: 1 }),
          source: 'default',
          confidence: 0.5,
        };
    }
  }

  private resolveFaker(path: string): any {
    const parts = path.split('.');
    let obj: any = faker;
    for (const part of parts) {
      obj = obj?.[part];
    }
    return typeof obj === 'function' ? obj() : obj;
  }

  private generateNormal(mean: number, stddev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(mean + stddev * z0);
  }

  /**
   * Generate a full record. Non-LLM fields are generated first,
   * then LLM fields are generated with the record as context.
   */
  async generateRecord(
    schema: any,
    rules?: any,
    distributions?: any,
  ): Promise<{ record: any; sources: any }> {
    const record: any = {};
    const sources: any = {};

    // Separate LLM fields from regular fields
    const regularFields: any[] = [];
    const llmFields: any[] = [];

    for (const field of schema.fields) {
      if (field.generator === 'llm') {
        llmFields.push(field);
      } else {
        regularFields.push(field);
      }
    }

    // 1. Generate all regular fields first
    for (const field of regularFields) {
      const { value, source, confidence } = this.generateValue(
        field,
        rules,
        distributions && distributions[field.name],
      );
      record[field.name] = value;
      sources[field.name] = { source, confidence };
    }

    // 2. Generate LLM fields with the record as context
    for (const field of llmFields) {
      try {
        const value = await this.generateLLMValue(field, record);
        record[field.name] = value;
        sources[field.name] = { source: 'llm', confidence: 0.8 };
      } catch (error) {
        this.logger.warn(`LLM generation failed for field ${field.name}: ${error.message}`);
        record[field.name] = null;
        sources[field.name] = { source: 'llm_failed', confidence: 0 };
      }
    }

    return { record, sources };
  }

  /**
   * Generate a field value using LLM (Ollama).
   * Builds a prompt from the field's description/prompt/llmOptions and the current record context.
   */
  private async generateLLMValue(field: any, recordContext: Record<string, any>): Promise<string> {
    const opts = field.llmOptions || {};

    // Build context summary from existing record fields
    const contextLines = Object.entries(recordContext)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    // Use field's custom prompt or build one from description
    let userPrompt: string;
    if (field.prompt) {
      // Replace {{fieldName}} placeholders with record values
      userPrompt = field.prompt.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => recordContext[key] !== undefined ? String(recordContext[key]) : `{{${key}}}`,
      );
    } else {
      userPrompt = `Generate a realistic value for the field "${field.name}".`;
      if (field.description) {
        userPrompt += `\nField description: ${field.description}`;
      }
      userPrompt += `\n\nContext from the same record:\n${contextLines}`;
    }

    // Add constraints
    if (opts.constraints) {
      userPrompt += `\n\nConstraints: ${opts.constraints}`;
    }

    // Add few-shot examples
    const examples: string[] = (opts.examples || []).filter((e: string) => e?.trim());
    if (examples.length > 0) {
      userPrompt += '\n\nExamples of expected output:';
      examples.forEach((ex: string, i: number) => {
        userPrompt += `\n${i + 1}. ${ex}`;
      });
    }

    // Build system prompt with output format guidance
    let systemPrompt = 'You are a synthetic data generator.';
    switch (opts.outputFormat) {
      case 'single_value':
        systemPrompt += ' Return ONLY a single value (a word, number, or short phrase). No sentences.';
        break;
      case 'sentence':
        systemPrompt += ' Return exactly ONE sentence. No bullet points or lists.';
        break;
      case 'paragraph':
        systemPrompt += ' Return a concise paragraph (2-4 sentences).';
        break;
      case 'list':
        systemPrompt += ' Return a short bullet list. Use "- " for each item.';
        break;
      case 'structured': {
        const keys = opts.structuredKeys
          ? opts.structuredKeys.split(',').map((k: string) => k.trim()).filter(Boolean)
          : null;
        if (keys?.length) {
          systemPrompt += ` Return structured key-value pairs, one per line, using "key: value" format. Use exactly these keys: ${keys.join(', ')}.`;
        } else {
          systemPrompt += ' Return structured key-value pairs, one per line, using "key: value" format.';
        }
        break;
      }
      case 'custom':
        if (opts.customFormat) {
          systemPrompt += ` ${opts.customFormat}`;
        } else {
          systemPrompt += ' Return ONLY the generated value as plain text.';
        }
        break;
      default:
        systemPrompt += ' Return ONLY the generated value as plain text.';
        break;
    }
    systemPrompt += ' No quotes, no explanation, no labels, no markdown formatting. Just the raw value.';

    // Add negative prompt to system prompt for stronger enforcement
    if (opts.negativePrompt) {
      systemPrompt += ` STRICT RULE: ${opts.negativePrompt}. This is a hard constraint — violating it makes the output invalid.`;
      this.logger.log(`[LLM] Field "${field.name}" negative prompt: ${opts.negativePrompt}`);
    }

    const temperature = opts.temperature ?? 0.8;
    const maxTokens = opts.maxLength ?? 300;

    this.logger.debug(`[LLM] Field "${field.name}" full prompt:\n--- USER ---\n${userPrompt}\n--- SYSTEM ---\n${systemPrompt}`);

    const response = await this.ollamaService.callModel(
      userPrompt,
      systemPrompt,
      temperature,
      maxTokens,
    );

    return response.trim();
  }
}
