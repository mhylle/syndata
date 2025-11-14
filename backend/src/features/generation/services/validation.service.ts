// backend/src/features/generation/services/validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationService {
  validateSchema(schema: any): void {
    if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
      throw new BadRequestException('Schema must contain fields array');
    }

    schema.fields.forEach((field: any, index: number) => {
      if (!field.name || !field.type) {
        throw new BadRequestException(
          `Field at index ${index} must have name and type`,
        );
      }

      const validTypes = ['string', 'number', 'date', 'boolean', 'email'];
      if (!validTypes.includes(field.type)) {
        throw new BadRequestException(
          `Field ${field.name} has invalid type: ${field.type}`,
        );
      }
    });
  }

  validateRules(rules: any, schema: any): void {
    if (!rules) return;

    const fieldNames = schema.fields.map((f: any) => f.name);

    Object.keys(rules).forEach((fieldName) => {
      if (!fieldNames.includes(fieldName)) {
        throw new BadRequestException(
          `Rule for unknown field: ${fieldName}`,
        );
      }
    });
  }

  validateConstraint(value: any, field: any): boolean {
    if (!field.constraints) return true;

    const { constraints } = field;

    if (constraints.min !== undefined && value < constraints.min) {
      return false;
    }

    if (constraints.max !== undefined && value > constraints.max) {
      return false;
    }

    if (constraints.pattern) {
      const regex = new RegExp(constraints.pattern);
      if (!regex.test(value)) {
        return false;
      }
    }

    if (constraints.allowedValues && !constraints.allowedValues.includes(value)) {
      return false;
    }

    return true;
  }
}
