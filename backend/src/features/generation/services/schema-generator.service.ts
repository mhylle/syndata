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

        lastResponse = JSON.parse(response);

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
        4000,
        requestId,
      );

      const schema: SyntheticSchemaDto = JSON.parse(response);

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
    return `You are an expert data schema designer.
Your task is to understand dataset requirements and ask clarifying questions.

You MUST ask exactly 1-2 clarifying questions before the user provides more information.
Never skip asking questions - this is mandatory.

Guidelines:
- Components can be any type (flat records, conversations, hierarchies)
- Fields can use primitives: string, number, date, boolean, email
- Generation rules can be: deterministic, statistical, or llm_prompt
- All structures are dynamic based on user needs

Respond ONLY with valid JSON:
{
  "clarifyingQuestions": [
    {
      "questionId": "q1",
      "question": "Your question here?",
      "questionType": "categorical|numeric|open_text"
    }
  ],
  "thoughtProcess": "Your reasoning about what you need to understand"
}`;
  }

  private buildSystemPromptForSchema(): string {
    return `You are an expert data schema designer for the Syndata system.
Your task is to generate a complete, dynamic schema based on user requirements.

Schema Requirements:
- Dynamic structure: any component types, fields, and generation rules
- Confidence scores: 0-1 for components, fields, and rules
- Generation rules: deterministic, statistical, or llm_prompt
- Primitive types: string, number, date, boolean, email
- Support for arrays, composition, callbacks/references between components

Respond ONLY with valid JSON following the SyntheticSchemaDto format.
Include detailed generation rules for each field.
Set realistic confidence scores (0.7-0.95 for certain rules, 0.3-0.6 for uncertain).
Include reasoning for each component in the description field.`;
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

    return `
Original Description: ${description}

Clarifying Question Answers:
${answersText}

Now generate the complete schema with:
1. All necessary components
2. Fields for each component with types and constraints
3. Generation rules (deterministic, statistical, or llm_prompt) for each field
4. Confidence scores for each element
5. Callbacks/references between components if relevant

Return valid JSON only.`;
  }

  private validateSchema(schema: SyntheticSchemaDto): void {
    if (!schema.schemaMetadata || !schema.rootStructure) {
      throw new BadRequestException('Schema missing required metadata or structure');
    }

    if (!Array.isArray(schema.rootStructure.components)) {
      throw new BadRequestException('Schema components must be an array');
    }

    const componentIds = new Set(schema.rootStructure.components.map((c) => c.id));

    // Validate all references exist
    for (const component of schema.rootStructure.components) {
      if (component.metadata?.callbackReferences) {
        for (const ref of component.metadata.callbackReferences) {
          if (!componentIds.has(ref)) {
            throw new BadRequestException(
              `Component ${component.id} references non-existent component ${ref}`,
            );
          }
        }
      }
    }
  }
}
