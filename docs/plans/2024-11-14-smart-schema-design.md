# Smart Schema Generation Design

**Date:** November 14, 2024
**Phase:** Phase 5B - LLM Integration
**Status:** Design Complete, Ready for Implementation
**LLM:** Ollama llama3.3 at http://ollama:11434

---

## Overview

Smart Schema Generation adds LLM-powered dataset creation to Syndata. Users describe their desired dataset in natural language, the LLM asks clarifying questions, then generates a complete schema including:
- Dynamic compositional structure (components + fields)
- Hybrid generation rules (deterministic, statistical, LLM-based)
- Confidence scores at all levels
- Metadata for audit trails and iterative refinement

The system supports any data structure type (flat records, conversations with callbacks, hierarchies, custom structures).

---

## Section 1: Dynamic Compositional Schema Model

Smart Schema outputs a **flexible, compositional schema** that can represent any data structure through a generic compositional pattern.

### Core Schema Structure

```json
{
  "schemaMetadata": {
    "name": "string - user provided dataset name",
    "description": "string - dataset description",
    "datasetType": "custom",
    "llmModel": "llama3.3",
    "conversationTurns": 2,
    "overallConfidence": 0.88,
    "createdAt": "ISO8601 timestamp",
    "conversionDuration": "ms from LLM completion to schema validation"
  },
  "primitiveTypes": [
    "string",
    "number",
    "date",
    "boolean",
    "email"
  ],
  "rootStructure": {
    "type": "composite",
    "componentCount": "integer",
    "components": [
      {
        "id": "component_1",
        "componentType": "string - LLM-determined abstraction",
        "description": "string - what this component represents",
        "confidence": "number 0-1 - LLM confidence in necessity",
        "isArray": "boolean - can this repeat?",
        "fields": {
          "fieldName": {
            "type": "primitive | enum | reference",
            "confidence": "number 0-1 - confidence this field is correct",
            "description": "string",
            "constraints": {
              "minLength": "number",
              "maxLength": "number",
              "pattern": "regex string",
              "min": "number",
              "max": "number",
              "enum": ["array of allowed values"],
              "distribution": "string - e.g., normal, lognormal"
            }
          }
        },
        "metadata": {
          "position": "integer - order in composition",
          "required": "boolean",
          "callbackReferences": ["array of component IDs this references"],
          "dependsOn": ["array of component IDs that must come first"],
          "generationRules": [/* see Section 2 */]
        }
      }
    ]
  }
}
```

### Key Principles

- **All component types are dynamic** - LLM determines structure based on description
- **All examples are placeholders** - The actual types, names, and structures are completely determined by LLM output
- **Support for relationships** - Components can reference and depend on other components
- **Support for composition** - Arrays allow components to repeat

---

## Section 2: Hybrid Generation Rules System with Confidence

The system supports **three rule types** applied during data generation, with clear execution semantics. Rules include confidence scores that affect generation probabilistically.

### Rule Types

**Type 1: Deterministic**
- Uses predefined generators (no LLM required)
- Execution: Direct function call during generation
- Examples: primitive type generators, sequential IDs, enum selection

**Type 2: Statistical**
- Uses probability distributions for numeric/temporal generation
- Execution: Direct calculation during generation
- Can reference previous component outputs for correlation

**Type 3: LLM Prompt**
- Sends templated prompt to Ollama during generation
- Execution: One LLM call per generated instance needing this rule
- Templates can reference context and previous outputs

### Rule Definition Schema

```json
{
  "generationRules": [
    {
      "ruleId": "string - unique identifier",
      "ruleType": "deterministic | statistical | llm_prompt",
      "confidence": "number 0-1 - quality/reliability of this rule",
      "priority": "integer - execution order (lower = earlier)",
      "inputs": ["array of component IDs or field paths this depends on"],
      "outputs": ["field names this rule populates"],

      "generatorName": "string - for deterministic rules",
      "parameters": "object - rule-specific parameters",

      "distribution": "string - for statistical rules",
      "distributionParams": {
        "mean": "number",
        "stddev": "number",
        "min": "number",
        "max": "number"
      },
      "correlations": ["array of component IDs to correlate with"],

      "promptTemplate": "string with {{variable}} syntax - for LLM rules",
      "model": "llama3.3",
      "temperature": "number 0-1",
      "maxTokens": "number"
    }
  ]
}
```

### Confidence Scores

- **Component confidence** (0-1): LLM's confidence this component is necessary
- **Field confidence** (0-1): LLM's confidence this field is correct
- **Rule confidence** (0-1): LLM's confidence in rule quality

### Probabilistic Rule Execution During Generation

For each record being generated:

1. Apply component confidence filter: Skip components below `minComponentConfidence`
2. For each component:
   - For each field (filtered by `minFieldConfidence`):
     - Skip if field.confidence < minFieldConfidence
   - For each rule (filtered by `minRuleConfidence`):
     - Skip if rule.confidence < minRuleConfidence
     - Generate random(0, 1)
     - If random ≤ rule.confidence: Execute rule for this record
     - Else: Skip rule for this record (field may be null/empty)

**Effect:**
- Low-confidence rules (0.3) used in ~30% of records
- High-confidence rules (0.9) used in ~90% of records
- Users can exclude low-quality components entirely via filters

### Generation Filter Schema

```json
{
  "generationFilters": {
    "minComponentConfidence": 0.6,
    "minRuleConfidence": 0.5,
    "minFieldConfidence": 0.4
  }
}
```

### Execution Order

1. Deterministic rules (by priority)
2. Statistical rules (by priority)
3. LLM prompt rules (by priority)

Allows dependencies: deterministic → statistical (using deterministic outputs) → LLM (using both)

---

## Section 3: LLM Prompt Engineering & Multi-Turn Conversation

### Turn 1: Initial Question Generation

**System Prompt Construction:**
- Explain schema model (components, fields, rules, confidence)
- Describe available rule types (deterministic, statistical, llm_prompt)
- List 5 primitive types (string, number, date, boolean, email)
- Show generic example schema (NOT domain-specific)
- **Instruct: Always ask 1-2 clarifying questions before generating schema**

**User Input:**
```json
{
  "description": "string - user's natural language description",
  "businessContext": "optional - context about the use case",
  "targetRecordCount": "optional - estimate of needed records",
  "domainExpertise": "optional - domain hints for the LLM"
}
```

**LLM Turn 1 Response (Must Ask Questions):**
```json
{
  "clarifyingQuestions": [
    {
      "questionId": "q1",
      "question": "string - specific question about dataset structure",
      "questionType": "categorical | numeric | open_text"
    },
    {
      "questionId": "q2",
      "question": "string - follow-up question",
      "questionType": "categorical | numeric | open_text"
    }
  ],
  "thoughtProcess": "string - LLM's reasoning about what it needs to understand"
}
```

### Turn 2-3: Schema Generation

**Validation:**
- If LLM doesn't ask questions: Retry with "You must ask 1-2 clarifying questions first"

**User Input (Turn 2):**
```json
{
  "answers": [
    { "questionId": "q1", "answer": "user answer" },
    { "questionId": "q2", "answer": "user answer" }
  ]
}
```

**LLM Turn 2-3 Response (Generate Full Schema):**
- Return complete SyntheticSchema with:
  - rootStructure (components + fields + confidence)
  - generationRules (hybrid: deterministic + statistical + llm_prompt)
  - Confidence scores at all levels
  - Reasoning for each component

### Error Handling

- **Invalid JSON:** Retry once with "Please respond in valid JSON format"
- **Schema coherence issues:** Return error with suggestions to refine
- **Rule references non-existent components:** Return error with suggestion
- **Too many LLM rules:** Warn user about generation cost (>50% of rules are LLM-based)

### No Timeouts

- LLM calls allowed to run indefinitely (may take minutes)
- Backend logs: start time, end time, duration
- Frontend shows loading indicator
- No cancellation except user-initiated

---

## Section 4: Frontend UI/UX Flow

### Entry Point
- **Button:** "Generate with AI" (green, sparkle icon ✨)
- **Location:** "Create Dataset" form
- **Action:** Opens modal

### Step 1: Initial Description Form

Modal displays:
- Text input: "Describe your dataset"
- Optional structured fields:
  - Business context (text)
  - Target record count (number)
  - Domain expertise hints (text)
- "Start Conversation" button

**User Action:** Fill form, click "Start Conversation"
- Frontend disables button, shows "Processing..." spinner
- Backend: `POST /projects/:projectId/schemas/generate`
- Response: `{ clarifyingQuestions[], conversationId, requestId }`

### Step 2: LLM Clarifying Questions

Modal updates:
- Original description displayed as reference
- LLM's 1-2 clarifying questions shown
- Answer inputs (type varies by question)
- "Continue" button
- Loading spinner while waiting for LLM

**User Action:** Answer questions, click "Continue"
- Frontend disables button, shows spinner (may show for minutes)
- Backend: `POST /projects/:projectId/schemas/:conversationId/refine`
- Response: `{ schema: SyntheticSchema, conversationHistory, timing }`

### Step 3: Schema Review Modal

Modal displays:
- Schema metadata (name, description, confidence, LLM model used)
- Components displayed as collapsible cards:
  - Component name, type, confidence score
  - Fields table: name, type, confidence, constraints
  - Generation rules section (color-coded):
    - Green = deterministic
    - Blue = statistical
    - Orange = LLM prompt
  - Callback references shown
- Inline editing:
  - Click field to edit name, type, constraints
  - Delete field button per field
  - Add field button per component
- Confidence filter sliders:
  - Min component confidence (0-1)
  - Min rule confidence (0-1)
  - Min field confidence (0-1)
  - Real-time preview of filtered schema

**User Actions:**
- "Regenerate" - Go back to Step 1, start over
- "Edit & Create" - Create dataset with this schema (goes to dataset detail)
- "Cancel" - Discard schema, return to manual creation

---

## Section 5: Backend Architecture & Data Flow

### New Services

**OllamaService**
- Wraps Ollama HTTP client (http://ollama:11434)
- Connection pooling and retry logic
- Methods:
  - `callModel(prompt, systemPrompt, temperature, maxTokens, requestId?)`
- **NO timeouts** - calls run indefinitely
- Logging: Start time, end time, duration for all calls
- Graceful cancellation: `cancelRequest(requestId)` stops call
- Error handling: Connection failures (retry), invalid JSON (retry once), malformed responses

**SchemaGeneratorService**
- Orchestrates multi-turn conversation
- Methods:
  - `generateInitialQuestions(description, structuredInfo, requestId)` → LLM Turn 1
    - Logs: Start time, end time, duration
  - `generateSchema(description, answers, requestId)` → LLM Turn 2-3
    - Logs: Start time, end time, duration
- Validates LLM responses:
  - Questions asked? (never skip)
  - Valid JSON?
  - Schema coherence?
- Returns: SyntheticSchema with timingMetadata

**SchemaParserService**
- Converts LLM output → internal schema objects
- Validates:
  - All components referenced in rules exist
  - All fields referenced exist
  - Confidence scores are 0-1
  - Rule priorities don't create cycles
- Returns: Validated schema or error with suggestions

**SyntheticSchema (Entity)**
- Database entity storing generated schemas
- Fields:
  - schemaMetadata
  - rootStructure
  - generationRules
  - confidenceScores
  - timingMetadata (startTime, endTime, duration)
  - conversationHistory (for audit trail)
- Relationships: One-to-one with Dataset

### API Endpoints

**1. Start Schema Generation**
```
POST /projects/:projectId/schemas/generate
Input: {
  description: string,
  businessContext?: string,
  targetRecordCount?: number,
  domainExpertise?: string
}
Output: {
  clarifyingQuestions: [{questionId, question, questionType}],
  conversationId: uuid,
  requestId: uuid
}
```

**2. Refine with Answers**
```
POST /projects/:projectId/schemas/:conversationId/refine
Input: {
  answers: [{questionId, answer}],
  requestId: uuid
}
Output: {
  schema: SyntheticSchema,
  conversationHistory: [{turn, role, content}],
  timing: {startTime, endTime, duration}
}
```

**3. Create Dataset from Schema**
```
POST /projects/:projectId/datasets/from-schema
Input: {
  schemaId: uuid,
  name: string,
  description: string,
  generationFilters?: {minComponentConfidence, minRuleConfidence, minFieldConfidence}
}
Output: {
  datasetId: uuid,
  schema: SyntheticSchema,
  timing: {totalDuration}
}
```

**4. Cancel Schema Generation (Optional)**
```
DELETE /projects/:projectId/schemas/:requestId
Output: {
  status: "cancelled",
  workCompleted: string
}
```

### Data Flow

```
User describes dataset
    ↓
Frontend: POST /schemas/generate (description + structured info)
    ↓
Backend SchemaGeneratorService: generateInitialQuestions()
    ↓
OllamaService: callModel(systemPrompt) → LLM Turn 1
    ↓
LLM returns clarifying questions
    ↓
Frontend displays questions, user answers
    ↓
Frontend: POST /schemas/:conversationId/refine (answers)
    ↓
Backend SchemaGeneratorService: generateSchema()
    ↓
OllamaService: callModel(systemPrompt with answers) → LLM Turn 2-3
    ↓
LLM returns full schema JSON
    ↓
SchemaParserService validates schema
    ↓
Frontend displays schema review modal
    ↓
User edits and confirms
    ↓
Frontend: POST /datasets/from-schema (schema + filters)
    ↓
Dataset entity created with SyntheticSchema relationship
```

### Error Handling

- Invalid JSON: Retry once with format hint
- Schema coherence issues: Return error with LLM suggestions
- Connection failures: Retry with exponential backoff
- User cancellation: Stop gracefully, log reason
- Validation errors: Clear error messages with hints for correction

### Logging & Timing

Example log entry:
```json
{
  "requestId": "uuid",
  "endpoint": "/schemas/generate",
  "llmModel": "llama3.3",
  "timestamp": "2024-11-14T16:30:00Z",
  "duration": {
    "turn1": 45000,
    "turn2": 120000,
    "total": 165000
  },
  "status": "completed",
  "llmCallCount": 2
}
```

---

## Section 6: Integration with Existing Syndata

### Database Schema Changes

1. Add `SyntheticSchema` entity:
   - Primary key: id (uuid)
   - Foreign key: datasetId (one-to-one with Dataset)
   - Fields: schemaMetadata, rootStructure, generationRules, timingMetadata, conversationHistory

2. Update `Dataset` entity:
   - Add optional relation: `syntheticSchema?: SyntheticSchema`

### Backward Compatibility

- Manual dataset creation (without AI) remains unchanged
- Existing datasets continue to work as-is
- AI button is optional enhancement

### Generation Service Updates

When generating records for dataset with SyntheticSchema:
1. Fetch SyntheticSchema
2. For each record:
   - Apply generationFilters (confidence thresholds)
   - For each component in rootStructure:
     - Skip if component.confidence < minComponentConfidence
     - For each field in component:
       - Apply field generation rule
       - Handle probabilistic rule execution (rule.confidence)
       - Call LLM if rule.type === "llm_prompt"
   - Store generated record with annotations (confidence, source)

---

## Testing Strategy

### Unit Tests

- **SchemaGeneratorService:** Mock OllamaService, test question generation and schema generation logic
- **SchemaParserService:** Test schema validation, error detection, cycle detection
- **OllamaService:** Mock HTTP calls, test error handling, retry logic

### Integration Tests

- Full flow: Description → Questions → Schema → Dataset creation
- Test with various dataset types (to verify flexibility)
- Test error scenarios (invalid LLM response, network failure)

### E2E Tests

- User creates dataset with AI (full flow)
- Generate records from AI-created dataset
- Verify records respect confidence filters and generation rules

---

## Implementation Phases

### Phase 1: Core Infrastructure
- OllamaService implementation
- SchemaGeneratorService setup
- API endpoints 1-3

### Phase 2: Schema Parsing & Storage
- SchemaParserService
- SyntheticSchema entity
- Database migration

### Phase 3: Frontend UI
- "Generate with AI" button
- 3-step modal flow
- Schema review modal with editing

### Phase 4: Generation Integration
- Update GenerationService to handle SyntheticSchema
- Implement probabilistic rule execution
- Confidence filtering

### Phase 5: Testing & Polish
- Comprehensive test coverage
- Error messages and edge cases
- Performance optimization

---

## Success Criteria

- ✅ Users can describe dataset in natural language
- ✅ LLM generates complete schema with components, fields, and rules
- ✅ Schema supports any data structure (flat, hierarchical, compositional)
- ✅ Hybrid generation rules work (deterministic, statistical, LLM)
- ✅ Confidence scores track quality at all levels
- ✅ Probabilistic rule execution respects confidence thresholds
- ✅ Generated data quality is equivalent to or better than manual schema
- ✅ No timeouts on LLM calls (logging only)
- ✅ Users can navigate away during generation without issues
- ✅ All existing Syndata functionality remains intact

---

**Design Status:** ✅ Complete and Validated
**Ready for:** Implementation Planning
