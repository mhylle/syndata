# Syndata MVP Design Document

**Date**: November 14, 2024
**Status**: Design Validated
**Phase**: MVP (No LLM integration yet)

---

## Executive Summary

Syndata is a flexible synthetic data generation platform for ML training and QA testing. The MVP enables:
- **Example-driven generation**: Upload real data, system learns patterns
- **Rule-based constraints**: Define what synthetic data should look like
- **Element composition**: Combine reusable elements (conversation turns, paragraphs) into complex outputs
- **Rich annotations**: Tag all generated data with metadata, confidence, and source information
- **Database-first storage**: All data persists with full lineage for export/analysis

---

## Requirements

### Functional Requirements

**FR1: Data Management**
- Users can create projects to organize generation work
- Users can define datasets (schemas, elements, generation rules)
- System supports two workflows: example-based and manual schema definition
- System auto-detects schema from uploaded examples (data types, field relationships)

**FR2: Generation**
- Users can trigger generation jobs with configurable parameters
- Simple generation: Create individual records respecting field rules and constraints
- Composite generation: Select and combine elements with transitions (gradual/abrupt)
- All generated data includes rich annotations (source, confidence, type)

**FR3: Storage & Export**
- All generated records stored in database with full lineage
- Records can be exported as JSON or CSV
- Annotations are preserved in exports
- Users can query/filter generated records

**FR4: Extensibility**
- Architecture supports multiple generator types (simple, composite, and future LLM)
- Element system is domain-agnostic (works for conversations, documents, workflows, etc.)
- Annotation system designed for future callback/context-aware enhancement

### Non-Functional Requirements

- Performance: Generate 1000 records in <5 seconds
- Reliability: All data persisted with transactional consistency
- Scalability: Architecture supports future horizontal scaling
- Maintainability: Clean separation of concerns, pluggable generators

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     SYNDATA PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Angular 19)        Backend (NestJS)              │
│  ├─ Projects Dashboard        ├─ Project Management        │
│  ├─ Dataset Config            ├─ Schema & Elements         │
│  ├─ Generation Config          ├─ Generation Engine        │
│  ├─ Results Explorer           ├─ Pattern Analysis        │
│  └─ Export Interface           ├─ Annotation Service      │
│                                └─ Export Service           │
│                                                               │
│                    PostgreSQL Database                       │
│                  (Records, Elements, Annotations)            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

**1. Example Data Manager**
- Upload and parse datasets (CSV, JSON)
- Store raw examples in database
- Analyze for patterns and field relationships

**2. Schema & Element Manager**
- Allow manual schema definition OR auto-detection from examples
- Store field definitions (name, type, constraints)
- Manage reusable elements (atomic units for composition)
- Validate schemas

**3. Pattern Analyzer**
- Extract field relationships from examples
- Identify distributions (e.g., "age mostly 25-45")
- Detect dependencies (e.g., "if premium=true, then spend>$1000")
- Store patterns for use in generation

**4. Generation Engine**
- SimpleDataGenerator: Generate individual fields respecting rules
- CompositeDataGenerator: Select elements, combine with transitions
- Support for parallel generation (future optimization)
- Pluggable interface for future generators (LLM, etc.)

**5. Validation Engine**
- Enforce field constraints (format, range, allowed values)
- Validate compositions (proper ordering, transitions)
- Check for data consistency

**6. Annotation System**
- Tag all generated data with metadata:
  - **Source**: Which rule/pattern/element generated this
  - **Confidence**: How realistic is this value (0-1)
  - **Type**: Synthesized, derived, or copied from example
- Store annotations in database for export/analysis

**7. Data Repository**
- Persist all records with JSONB storage
- Maintain generation job history
- Track lineage (which job produced which records)
- Support efficient querying and filtering

**8. Export Service**
- Convert stored records to JSON/CSV
- Include or exclude annotations based on user preference
- Support filtering and sampling

---

## Data Model

### Core Entities

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datasets (configurations for generation)
CREATE TABLE datasets (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects,
  name VARCHAR NOT NULL,
  schema_definition JSONB NOT NULL,  -- Field definitions
  created_at TIMESTAMP DEFAULT NOW()
);

-- Elements (reusable atomic units)
CREATE TABLE elements (
  id UUID PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,  -- e.g., "conversation_turn", "paragraph"
  definition JSONB NOT NULL,  -- Element constraints and rules
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generation Jobs
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects,
  dataset_id UUID NOT NULL REFERENCES datasets,
  status VARCHAR NOT NULL,  -- pending, running, completed, failed
  count INTEGER NOT NULL,
  config JSONB NOT NULL,  -- Rules, composition config, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Generated Records
CREATE TABLE records (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects,
  generation_job_id UUID NOT NULL REFERENCES generation_jobs,
  data JSONB NOT NULL,  -- The actual generated data
  is_composite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Element Instances (specific use of element in composition)
CREATE TABLE element_instances (
  id UUID PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES records,
  element_id UUID NOT NULL REFERENCES elements,
  position INTEGER NOT NULL,  -- Order in composition
  transition_type VARCHAR NOT NULL,  -- 'gradual' or 'abrupt'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Field Values
CREATE TABLE field_values (
  id UUID PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES records,
  field_name VARCHAR NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR NOT NULL,  -- 'string', 'number', 'date', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY,
  target_type VARCHAR NOT NULL,  -- 'record' or 'field'
  target_id UUID NOT NULL,  -- record_id or field_value_id
  annotation_type VARCHAR NOT NULL,  -- 'source', 'confidence', 'type'
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Data Storage Strategy

- **JSONB for flexibility**: Records store complete generated data as JSONB
- **Separate field tracking**: field_values table allows querying/filtering specific fields
- **Lineage preserved**: Annotations link records to their sources (rules, patterns, elements)
- **Composability tracked**: element_instances show which elements built each composite record

---

## API Design

### REST Endpoints

```
Projects
  POST   /projects
  GET    /projects
  GET    /projects/:id
  PUT    /projects/:id
  DELETE /projects/:id

Datasets
  POST   /projects/:id/datasets
  GET    /projects/:id/datasets
  GET    /projects/:id/datasets/:datasetId
  PUT    /projects/:id/datasets/:datasetId
  DELETE /projects/:id/datasets/:datasetId

Examples (for learning patterns)
  POST   /projects/:id/datasets/:datasetId/examples
  GET    /projects/:id/datasets/:datasetId/examples
  DELETE /projects/:id/datasets/:datasetId/examples/:exampleId

Elements
  POST   /projects/:id/datasets/:datasetId/elements
  GET    /projects/:id/datasets/:datasetId/elements
  GET    /projects/:id/datasets/:datasetId/elements/:elementId
  PUT    /projects/:id/datasets/:datasetId/elements/:elementId
  DELETE /projects/:id/datasets/:datasetId/elements/:elementId

Generation
  POST   /projects/:id/generate
  GET    /projects/:id/jobs/:jobId
  GET    /projects/:id/jobs  (list all jobs)

Records
  GET    /projects/:id/records
  GET    /projects/:id/records/:recordId
  DELETE /projects/:id/records/:recordId

Export
  POST   /projects/:id/export
    body: { format: 'json'|'csv', jobIds?: [], includeAnnotations?: true }
```

### Request/Response Examples

```json
// POST /projects
{
  "name": "E-Commerce ML Training",
  "description": "Synthetic customer and transaction data for ML models"
}

// POST /projects/:id/datasets
{
  "name": "Customer Dataset",
  "schema": {
    "fields": [
      { "name": "customer_id", "type": "string", "constraints": { "pattern": "C[0-9]{6}" } },
      { "name": "age", "type": "number", "constraints": { "min": 18, "max": 100 } },
      { "name": "email", "type": "string", "constraints": { "pattern": "^[^@]+@[^@]+\\.[^@]+$" } }
    ]
  }
}

// POST /projects/:id/generate
{
  "datasetId": "uuid-here",
  "count": 1000,
  "rules": {
    "customer_id": { "generate": "sequential" },
    "age": { "distribution": "normal", "mean": 35, "stddev": 15 },
    "email": { "generate": "from_pattern" }
  }
}

// GET /projects/:id/records/:recordId
{
  "id": "record-uuid",
  "data": {
    "customer_id": "C123456",
    "age": 34,
    "email": "john.doe@example.com"
  },
  "annotations": [
    { "field": "age", "source": "distribution_rule", "confidence": 0.95 },
    { "field": "email", "source": "pattern_rule", "confidence": 0.98 }
  ]
}
```

---

## Generation Workflow

### Simple Data Generation

```
1. Validate dataset schema
2. Load generation rules
3. For each record (0 to count):
   a. For each field in schema:
      - Check field constraints
      - Check if rule exists for this field
      - Generate value respecting rule and constraints
      - Create annotation (source, confidence)
   b. Store record with all field values and annotations
4. Update job status to "completed"
```

### Composite Data Generation

```
1. Validate dataset schema and elements
2. Load composition config (element selection, transitions)
3. For each record (0 to count):
   a. Select elements randomly (or per template)
   b. For each selected element:
      - Generate element instance
      - Apply transition type (gradual/abrupt)
      - Create content respecting element definition
      - Record element usage in annotations
   c. Combine elements in sequence
   d. Store as single record with element lineage
4. Update job status to "completed"
```

---

## Frontend Architecture

### Core Pages

1. **Projects Dashboard** - List/create/manage projects
2. **Dataset Builder** - Define schema, upload examples, configure rules
3. **Generation Console** - Configure and execute generation jobs
4. **Results Explorer** - View, filter, export generated records
5. **Elements Library** - Manage reusable elements

### Component Structure

```
app/
├── features/
│   ├── projects/
│   │   ├── projects-list/
│   │   ├── project-detail/
│   │   └── project-form/
│   ├── datasets/
│   │   ├── dataset-builder/
│   │   ├── schema-editor/
│   │   ├── example-uploader/
│   │   └── element-editor/
│   ├── generation/
│   │   ├── generation-form/
│   │   ├── job-monitor/
│   │   └── results-explorer/
│   └── records/
│       ├── record-list/
│       ├── record-detail/
│       └── export-dialog/
├── shared/
│   ├── services/
│   │   ├── project.service.ts
│   │   ├── dataset.service.ts
│   │   ├── generation.service.ts
│   │   └── export.service.ts
│   └── models/
└── core/
    └── auth/ (existing)
```

---

## Testing Strategy

### Unit Tests (40%)
- PatternAnalyzer: Field relationship extraction
- ValidationEngine: Rule enforcement
- AnnotationService: Metadata tagging
- Generators: Individual generator logic
- Services: Business logic in isolation

### Integration Tests (40%)
- End-to-end generation: Examples → Generation → Records → Export
- Composition workflow: Elements → Composition → Annotated output
- Database transactions: Multi-step operations with rollback
- Export formats: JSON/CSV correctness

### E2E Tests (20%)
- Full user journey: Project creation → Configuration → Generation → Export
- Error scenarios: Invalid schemas, failed generation, export errors
- UI interactions: Form submission, data display, filtering

### Coverage Targets
- Core generation logic: >90%
- API endpoints: >80%
- Services: >85%

---

## Implementation Phases

### Phase 1: Foundation (Infrastructure)
- Database schema setup
- Base API structure
- Authentication integration
- Project and Dataset management

### Phase 2: Simple Generation
- Simple data generator implementation
- Rules engine
- Annotation system
- Basic export (JSON)

### Phase 3: Composite Generation
- Element management
- Composition engine
- Transition handling
- Export enhancements (CSV)

### Phase 4: Frontend
- UI for all features
- Generation monitoring
- Results exploration
- Export interface

### Phase 5: Testing & Polish
- Comprehensive test coverage
- Performance optimization
- Error handling refinement
- Documentation

---

## Future Enhancements (Post-MVP)

1. **LLM Integration**: Use LLM for intelligent text and contextual generation
2. **Callbacks**: Context-aware element modification referencing previous elements
3. **Advanced Transitions**: Sophisticated transition logic beyond gradual/abrupt
4. **Pattern Learning**: ML-based pattern analysis from examples
5. **Versioning**: Dataset and element versioning for reproducibility
6. **Sharing**: Share datasets and elements across projects
7. **Templates**: Pre-built templates for common scenarios
8. **Performance**: Batch processing, distributed generation, caching

---

## Success Criteria

✅ Users can upload examples and system auto-detects schema
✅ Users can define generation rules and constraints
✅ Simple generation: Create 1000 structured records in <5s
✅ Composite generation: Create 100 complex compositions in <5s
✅ All generated records include annotations (source, confidence, type)
✅ Export works for JSON and CSV formats
✅ System preserves lineage for all data
✅ Architecture supports future LLM integration without major refactoring

---

## Dependencies & Risks

### Dependencies
- PostgreSQL 17 with pgvector (available in template)
- NestJS 11 (available in template)
- Angular 19 (available in template)
- No external LLM APIs needed for MVP

### Risks & Mitigation
- **Risk**: Complex generation rules parsing
  - **Mitigation**: Start simple (YAML/JSON rules), add GUI builder later
- **Risk**: Performance degradation with large datasets
  - **Mitigation**: Optimize later, test with realistic volumes
- **Risk**: Data quality concerns
  - **Mitigation**: Confidence scores and annotations provide transparency
- **Risk**: Composition logic becomes complex
  - **Mitigation**: Keep MVP simple (sequential), callbacks added later

---

## Open Questions & Decisions

1. **Rule Language**: Use YAML, JSON, or custom DSL? (Recommended: JSON with UI builder)
2. **Pattern Detection**: How sophisticated? (Recommended: Simple distributions + relationships)
3. **Composition Limits**: Max elements per composition? (Recommended: No hard limit initially)
4. **Export Limits**: Max records per export? (Recommended: Unlimited, stream for large exports)

---

## Document History

- **2024-11-14**: Initial design created and validated
