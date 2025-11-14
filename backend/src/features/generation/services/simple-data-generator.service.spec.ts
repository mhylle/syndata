// backend/src/features/generation/services/simple-data-generator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SimpleDataGeneratorService } from './simple-data-generator.service';

describe('SimpleDataGeneratorService', () => {
  let service: SimpleDataGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimpleDataGeneratorService],
    }).compile();

    service = module.get<SimpleDataGeneratorService>(SimpleDataGeneratorService);
  });

  describe('generateValue', () => {
    it('should generate email with email type', () => {
      const field = { name: 'email', type: 'email' };
      const result = service.generateValue(field);

      expect(result.value).toContain('@');
      expect(result.source).toBeDefined();
    });

    it('should use fixed rule if provided', () => {
      const field = { name: 'status', type: 'string' };
      const rules = { status: { value: 'active' } };

      const result = service.generateValue(field, rules);
      expect(result.value).toBe('active');
      expect(result.confidence).toBe(1.0);
    });

    it('should generate number within range', () => {
      const field = { name: 'age', type: 'number' };
      const result = service.generateValue(field);

      expect(typeof result.value).toBe('number');
    });
  });

  describe('generateRecord', () => {
    it('should generate complete record', () => {
      const schema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'email', type: 'email' },
        ],
      };

      const { record, sources } = service.generateRecord(schema);

      expect(record.id).toBeDefined();
      expect(record.name).toBeDefined();
      expect(record.email).toContain('@');
      expect(sources.id).toBeDefined();
      expect(sources.email.source).toBeDefined();
    });

    it('should respect generation rules', () => {
      const schema = {
        fields: [
          { name: 'status', type: 'string' },
        ],
      };
      const rules = { status: { value: 'premium' } };

      const { record } = service.generateRecord(schema, rules);
      expect(record.status).toBe('premium');
    });
  });
});
