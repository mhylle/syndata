import { Injectable, Logger } from '@nestjs/common';
import { SyntheticSchemaDto } from '../dto/schema-response.dto';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class SchemaParserService {
  private readonly logger = new Logger(SchemaParserService.name);

  validateSchema(schema: SyntheticSchemaDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!schema.schemaMetadata) {
      errors.push('Missing schemaMetadata');
      return { valid: false, errors, warnings };
    }

    if (!schema.rootStructure) {
      errors.push('Missing rootStructure');
      return { valid: false, errors, warnings };
    }

    // Validate confidence scores
    if (schema.schemaMetadata.overallConfidence < 0 || schema.schemaMetadata.overallConfidence > 1) {
      errors.push('Overall confidence must be between 0 and 1');
    }

    // Validate components
    if (!Array.isArray(schema.rootStructure.components)) {
      errors.push('Components must be an array');
      return { valid: false, errors, warnings };
    }

    const componentIds = new Set(schema.rootStructure.components.map((c) => c.id));

    for (const component of schema.rootStructure.components) {
      // Validate component confidence
      if (component.confidence < 0 || component.confidence > 1) {
        errors.push(`Component ${component.id}: confidence must be 0-1`);
      }

      // Validate field confidence
      for (const [fieldName, field] of Object.entries(component.fields || {})) {
        if (field.confidence < 0 || field.confidence > 1) {
          errors.push(
            `Component ${component.id}, field ${fieldName}: confidence must be 0-1`,
          );
        }
      }

      // Validate references
      if (component.metadata?.callbackReferences) {
        for (const ref of component.metadata.callbackReferences) {
          if (!componentIds.has(ref)) {
            errors.push(
              `Component ${component.id}: references non-existent component ${ref}`,
            );
          }
        }
      }

      // Validate generation rules
      if (component.metadata?.generationRules) {
        for (const rule of component.metadata.generationRules) {
          if (rule.confidence < 0 || rule.confidence > 1) {
            errors.push(
              `Component ${component.id}, rule ${rule.ruleId}: confidence must be 0-1`,
            );
          }

          // Validate rule inputs/outputs reference existing fields
          const fieldNames = Object.keys(component.fields || {});
          for (const input of rule.inputs || []) {
            const fieldRef = input.split('.')[1]; // e.g., "comp1.field" → "field"
            if (fieldRef && !fieldNames.includes(fieldRef)) {
              warnings.push(
                `Component ${component.id}, rule ${rule.ruleId}: input references unknown field ${fieldRef}`,
              );
            }
          }
        }
      }
    }

    // Check for cycles in dependencies
    const hasCycle = this.detectCycle(schema.rootStructure.components);
    if (hasCycle) {
      errors.push('Circular dependency detected in component references');
    }

    // Warn if too many LLM rules
    let llmRuleCount = 0;
    let totalRuleCount = 0;
    for (const component of schema.rootStructure.components) {
      for (const rule of component.metadata?.generationRules || []) {
        totalRuleCount++;
        if (rule.ruleType === 'llm_prompt') {
          llmRuleCount++;
        }
      }
    }
    if (totalRuleCount > 0 && llmRuleCount / totalRuleCount > 0.5) {
      warnings.push(
        `High number of LLM rules (${llmRuleCount}/${totalRuleCount}): generation may be slow`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectCycle(components: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (componentId: string): boolean => {
      visited.add(componentId);
      recursionStack.add(componentId);

      const component = components.find((c) => c.id === componentId);
      if (!component || !component.metadata?.callbackReferences) {
        recursionStack.delete(componentId);
        return false;
      }

      for (const ref of component.metadata.callbackReferences) {
        if (!visited.has(ref)) {
          if (hasCycleDFS(ref)) {
            return true;
          }
        } else if (recursionStack.has(ref)) {
          return true;
        }
      }

      recursionStack.delete(componentId);
      return false;
    };

    for (const component of components) {
      if (!visited.has(component.id)) {
        if (hasCycleDFS(component.id)) {
          return true;
        }
      }
    }

    return false;
  }
}
