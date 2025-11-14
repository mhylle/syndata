// backend/src/features/generation/services/pattern-analyzer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PatternAnalyzerService } from './pattern-analyzer.service';

describe('PatternAnalyzerService', () => {
  let service: PatternAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatternAnalyzerService],
    }).compile();

    service = module.get<PatternAnalyzerService>(PatternAnalyzerService);
  });

  describe('analyzeFieldDistribution', () => {
    it('should analyze numeric distribution', () => {
      const values = [10, 20, 30, 40, 50];
      const result = service.analyzeFieldDistribution(values);

      expect(result.min).toBe(10);
      expect(result.max).toBe(50);
      expect(result.mean).toBe(30);
      expect(result.count).toBe(5);
    });

    it('should return null for empty array', () => {
      const result = service.analyzeFieldDistribution([]);
      expect(result).toBeNull();
    });
  });

  describe('analyzeStringPatterns', () => {
    it('should analyze string patterns', () => {
      const values = ['hello', 'world', 'test', 'data'];
      const result = service.analyzeStringPatterns(values);

      expect(result.minLength).toBe(4);
      expect(result.maxLength).toBe(5);
      expect(result.samples).toContain('hello');
    });
  });

  describe('detectFieldRelationships', () => {
    it('should detect correlated fields', () => {
      const records = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
        { id: 3, name: 'Bob', email: 'bob@example.com' },
        { id: 4, name: 'Alice', email: 'alice@example.com' },
      ];
      const schema = {
        fields: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string' },
        ],
      };

      const relationships = service.detectFieldRelationships(records, schema);
      expect(relationships.size).toBeGreaterThan(0);
    });
  });
});
