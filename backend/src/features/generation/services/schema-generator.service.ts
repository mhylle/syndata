import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { v4 as uuidv4 } from 'uuid';
import { ClarifyingQuestion, SyntheticSchemaDto, RefineSchemaResponseDto } from '../dto/schema-response.dto';

@Injectable()
export class SchemaGeneratorService {
  private readonly logger = new Logger(SchemaGeneratorService.name);
  private readonly MAX_RETRIES_NO_QUESTIONS = 2;

  constructor(private readonly ollamaService: OllamaService) {}

  async generateInitialQuestions(
    description: string,
    structuredInfo: {
      businessContext?: string;
      targetRecordCount?: number;
      domainExpertise?: string;
    },
    requestId: string,
  ): Promise<{
    clarifyingQuestions: ClarifyingQuestion[];
    conversationId: string;
    requestId: string;
  }> {
    const conversationId = uuidv4();
    const systemPrompt = this.buildSystemPromptForQuestions();
    const userPrompt = this.buildUserPromptForDescription(description, structuredInfo);

    let attempt = 0;
    let lastResponse: any;

    while (attempt < this.MAX_RETRIES_NO_QUESTIONS) {
      try {
        this.logger.log(
          `[${requestId}] Generating clarifying questions (attempt ${attempt + 1})`,
        );

        const response = await this.ollamaService.callModel(
          userPrompt,
          systemPrompt,
          0.7,
          1500,
          requestId,
        );

        lastResponse = JSON.parse(this.extractJson(response));

        // Validate that questions were asked
        if (
          !lastResponse.clarifyingQuestions ||
          lastResponse.clarifyingQuestions.length === 0
        ) {
          this.logger.warn(
            `[${requestId}] LLM did not ask questions, retrying...`,
          );
          attempt++;
          if (attempt >= this.MAX_RETRIES_NO_QUESTIONS) {
            break;
          }
          continue;
        }

        return {
          clarifyingQuestions: lastResponse.clarifyingQuestions,
          conversationId,
          requestId,
        };
      } catch (error) {
        this.logger.error(`[${requestId}] Error generating questions: ${error.message}`);
        throw new BadRequestException(
          `Failed to generate clarifying questions: ${error.message}`,
        );
      }
    }

    throw new BadRequestException(
      'LLM failed to ask clarifying questions after multiple attempts',
    );
  }

  async generateSchema(
    description: string,
    answers: Array<{ questionId: string; answer: string }>,
    conversationId: string,
    requestId: string,
  ): Promise<RefineSchemaResponseDto> {
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPromptForSchema();
    const userPrompt = this.buildUserPromptForSchema(description, answers);

    try {
      this.logger.log(`[${requestId}] Generating full schema`);

      const response = await this.ollamaService.callModel(
        userPrompt,
        systemPrompt,
        0.7,
        8000,
        requestId,
      );

      const schema: SyntheticSchemaDto = JSON.parse(this.extractJson(response));

      // Validate schema coherence
      this.validateSchema(schema);

      const endTime = Date.now();

      return {
        schema,
        conversationHistory: [
          {
            turn: 1,
            role: 'user',
            content: description,
          },
          {
            turn: 2,
            role: 'user',
            content: `Answers: ${JSON.stringify(answers)}`,
          },
          {
            turn: 3,
            role: 'assistant',
            content: 'Schema generated',
          },
        ],
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      this.logger.error(`[${requestId}] Error generating schema: ${error.message}`);
      throw new BadRequestException(
        `Failed to generate schema: ${error.message}`,
      );
    }
  }

  private buildSystemPromptForQuestions(): string {
    return `You are an expert data schema designer. Your task is to understand dataset requirements and ask clarifying questions.

You MUST ask exactly 1-2 clarifying questions. Never skip asking questions.

CRITICAL: Your entire response must be a single valid JSON object. No markdown, no code fences, no explanation text before or after. Do not use bold (**) or any formatting inside JSON string values.

Required JSON format:
{"clarifyingQuestions":[{"questionId":"q1","question":"Your question here?","questionType":"open_text"}],"thoughtProcess":"Your reasoning"}`;
  }

  private buildSystemPromptForSchema(): string {
    return `You are an expert data schema designer for the Syndata synthetic data system.

CRITICAL: Your entire response must be a single valid JSON object. No markdown, no code fences, no explanation before or after. Do not use bold (**) or any formatting inside JSON string values.

Generate a complete schema following this exact structure:
{
  "schemaMetadata": {
    "name": "short_name",
    "description": "What this dataset represents",
    "datasetType": "tabular",
    "llmModel": "ministral-3",
    "conversationTurns": 2,
    "overallConfidence": 0.85,
    "createdAt": "2026-01-01T00:00:00Z",
    "conversionDuration": 0
  },
  "primitiveTypes": ["string","number","date","boolean","email"],
  "rootStructure": {
    "type": "composite",
    "componentCount": 1,
    "components": [
      {
        "id": "comp_1",
        "componentType": "record_type_name",
        "description": "What this component represents",
        "confidence": 0.85,
        "isArray": false,
        "fields": {
          "field_name": {
            "type": "string",
            "confidence": 0.9,
            "description": "Field description"
          }
        },
        "metadata": {
          "position": 0,
          "required": true,
          "callbackReferences": [],
          "generationRules": [
            {
              "ruleId": "rule_1",
              "ruleType": "deterministic",
              "confidence": 0.9,
              "priority": 1,
              "inputs": [],
              "outputs": ["field_name"],
              "generatorName": "faker_name"
            }
          ]
        }
      }
    ]
  }
}

Available deterministic generators: faker_email, faker_name, faker_firstName, faker_lastName, faker_phone, faker_address, faker_city, faker_country, faker_company, faker_uuid, faker_date, faker_boolean, faker_number (params: min, max), enum_select (params: values array), constant (params: value), sequential (params: start, increment).

Statistical rule types: normal (params: mean, stddev), uniform (params: min, max), exponential (params: lambda), poisson (params: lambda).

Use llm_prompt ruleType sparingly - only for complex contextual values. Set confidence 0.7-0.95 for certain elements, 0.3-0.6 for uncertain.`;
  }

  private buildUserPromptForDescription(
    description: string,
    structuredInfo: {
      businessContext?: string;
      targetRecordCount?: number;
      domainExpertise?: string;
    },
  ): string {
    let prompt = `Dataset Description: ${description}\n\n`;
    if (structuredInfo.businessContext) {
      prompt += `Business Context: ${structuredInfo.businessContext}\n`;
    }
    if (structuredInfo.targetRecordCount) {
      prompt += `Target Record Count: ${structuredInfo.targetRecordCount}\n`;
    }
    if (structuredInfo.domainExpertise) {
      prompt += `Domain Expertise: ${structuredInfo.domainExpertise}\n`;
    }
    prompt += `\nAsk 1-2 clarifying questions to better understand the requirements.`;
    return prompt;
  }

  private buildUserPromptForSchema(
    description: string,
    answers: Array<{ questionId: string; answer: string }>,
  ): string {
    const answersText = answers
      .map((a) => `Q: (${a.questionId}) - A: ${a.answer}`)
      .join('\n');

    return `Original Description: ${description}

Answers:
${answersText}

Generate the schema JSON now. Keep it compact:
- Use 1-2 components with up to 15 fields total
- Put generation rules in the component metadata.generationRules array (not inside each field)
- Use short field descriptions
- Prefer deterministic generators over llm_prompt (use llm_prompt only for 1-2 complex fields)
- Return valid JSON only, no markdown`;
  }

  /**
   * Extract JSON from LLM response that may be wrapped in markdown code fences
   */
  private extractJson(response: string): string {
    let text = response.trim();

    // Remove markdown code fences
    const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim();
    }

    // Find first { and last } to extract JSON object
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    return text;
  }

  private validateSchema(schema: SyntheticSchemaDto): void {
    if (!schema.schemaMetadata || !schema.rootStructure) {
      throw new BadRequestException('Schema missing required metadata or structure');
    }

    if (!Array.isArray(schema.rootStructure.components)) {
      throw new BadRequestException('Schema components must be an array');
    }

    const componentIds = new Set(schema.rootStructure.components.map((c) => c.id));

    // Warn about invalid references but don't fail - LLMs sometimes reference fields as components
    for (const component of schema.rootStructure.components) {
      if (component.metadata?.callbackReferences) {
        const validRefs = component.metadata.callbackReferences.filter(
          (ref) => componentIds.has(ref),
        );
        if (validRefs.length !== component.metadata.callbackReferences.length) {
          this.logger.warn(
            `Component ${component.id} has invalid callback references, cleaning up`,
          );
          component.metadata.callbackReferences = validRefs;
        }
      }
    }
  }
}
