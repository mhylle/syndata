// backend/src/features/generation/services/validation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { BadRequestException } from '@nestjs/common';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateSchema', () => {
    it('should accept valid schema', () => {
      const schema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'age', type: 'number' },
        ],
      };

      expect(() => service.validateSchema(schema)).not.toThrow();
    });

    it('should reject schema without fields', () => {
      expect(() => service.validateSchema({})).toThrow(BadRequestException);
    });

    it('should reject field without name', () => {
      const schema = {
        fields: [{ type: 'string' }],
      };

      expect(() => service.validateSchema(schema)).toThrow(BadRequestException);
    });

    it('should reject invalid field type', () => {
      const schema = {
        fields: [{ name: 'id', type: 'invalid_type' }],
      };

      expect(() => service.validateSchema(schema)).toThrow(BadRequestException);
    });
  });

  describe('validateRules', () => {
    it('should accept valid rules', () => {
      const schema = { fields: [{ name: 'age', type: 'number' }] };
      const rules = { age: { min: 18 } };

      expect(() => service.validateRules(rules, schema)).not.toThrow();
    });

    it('should reject rule for unknown field', () => {
      const schema = { fields: [{ name: 'age', type: 'number' }] };
      const rules = { unknown_field: {} };

      expect(() => service.validateRules(rules, schema)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateConstraint', () => {
    it('should pass value within range', () => {
      const field = { constraints: { min: 18, max: 100 } };
      expect(service.validateConstraint(35, field)).toBe(true);
    });

    it('should fail value below min', () => {
      const field = { constraints: { min: 18 } };
      expect(service.validateConstraint(10, field)).toBe(false);
    });

    it('should validate pattern', () => {
      const field = { constraints: { pattern: '^[A-Z]+$' } };
      expect(service.validateConstraint('ABC', field)).toBe(true);
      expect(service.validateConstraint('abc', field)).toBe(false);
    });
  });
});
