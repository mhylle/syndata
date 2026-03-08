// backend/src/features/generation/controllers/generation.controller.ts
import { Controller, Post, Get, Body, Param, Query, Delete, HttpCode, HttpStatus, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { GenerationService } from '../services/generation.service';
import { ExportService } from '../services/export.service';
import { TemplateService } from '../services/template.service';
import { SchemaGeneratorService } from '../services/schema-generator.service';
import { SchemaParserService } from '../services/schema-parser.service';
import { OllamaService } from '../services/ollama.service';
import { GenerateDto } from '../dto/generate.dto';
import { ExportDto } from '../dto/export.dto';
import {
  GenerateSchemaDto,
  RefineSchemaDto,
  CreateDatasetFromSchemaDto
} from '../dto/generate-schema.dto';
import {
  GenerateSchemaResponseDto,
  RefineSchemaResponseDto
} from '../dto/schema-response.dto';
import { GenerateFromSchemaDto } from '../dto/generate-from-schema.dto';
import { DatasetService } from '../../datasets/services/dataset.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Generation')
@Controller('projects/:projectId')
export class GenerationController {
  // In-memory store for conversation descriptions (keyed by conversationId)
  private conversationDescriptions = new Map<string, string>();

  constructor(
    private readonly generationService: GenerationService,
    private readonly exportService: ExportService,
    private readonly templateService: TemplateService,
    private readonly schemaGeneratorService: SchemaGeneratorService,
    private readonly schemaParserService: SchemaParserService,
    private readonly ollamaService: OllamaService,
    private readonly datasetService: DatasetService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Trigger synthetic data generation' })
  generate(@Param('projectId') projectId: string, @Body() generateDto: GenerateDto) {
    return this.generationService.generate(projectId, generateDto);
  }

  @Post('datasets/:datasetId/generate-from-schema')
  @ApiOperation({
    summary: 'Generate synthetic data from AI-generated schema',
    description: 'Triggers data generation job using schema created by AI Schema Generator'
  })
  @ApiResponse({
    status: 201,
    description: 'Generation job created successfully',
    schema: {
      properties: {
        jobId: { type: 'string' },
        message: { type: 'string' },
        count: { type: 'number' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid dataset or schema definition'
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found'
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'datasetId', description: 'Dataset ID with AI-generated schema' })
  async generateFromSchema(
    @Param('projectId') projectId: string,
    @Param('datasetId') datasetId: string,
    @Body() dto: GenerateFromSchemaDto,
  ): Promise<{ jobId: string; message: string; count: number }> {
    return this.generationService.generateFromAISchema(
      projectId,
      datasetId,
      dto.count,
      {
        minComponentConfidence: dto.minComponentConfidence,
        minRuleConfidence: dto.minRuleConfidence,
        minFieldConfidence: dto.minFieldConfidence,
      },
    );
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get generation job status' })
  getJob(@Param('jobId') jobId: string) {
    return this.generationService.getJob(jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all generation jobs for a project' })
  getJobs(@Param('projectId') projectId: string) {
    return this.generationService.getJobs(projectId);
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel a running generation job' })
  cancelJob(@Param('jobId') jobId: string) {
    return this.generationService.cancelJob(jobId);
  }

  @Post('jobs/:jobId/resume')
  @ApiOperation({ summary: 'Resume a cancelled or failed generation job' })
  @ApiResponse({ status: 201, description: 'Generation resumed successfully' })
  @ApiResponse({ status: 400, description: 'Job cannot be resumed' })
  resumeJob(@Param('jobId') jobId: string) {
    return this.generationService.resumeJob(jobId);
  }

  @Delete('jobs/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a generation job and all its records' })
  @ApiResponse({ status: 200, description: 'Job and records deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete running job' })
  deleteJob(@Param('jobId') jobId: string) {
    return this.generationService.deleteJob(jobId);
  }

  @Get('records')
  @ApiOperation({ summary: 'Get generated records' })
  getRecords(
    @Param('projectId') projectId: string,
    @Query('jobId') jobId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.generationService.getRecords(jobId, skip, take);
  }

  @Get('records/:recordId')
  @ApiOperation({ summary: 'Get a specific generated record' })
  getRecord(@Param('recordId') recordId: string) {
    return this.generationService.getRecord(recordId);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export generated records as CSV or JSON' })
  @ApiResponse({ status: 200, description: 'Export file returned' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async exportRecords(
    @Param('projectId') projectId: string,
    @Body() dto: ExportDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.exportService.exportRecords(projectId, {
      format: dto.format,
      jobIds: dto.jobIds,
      includeAnnotations: dto.includeAnnotations,
      fields: dto.fields,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  // Schema Generation Endpoints

  @Post('schemas/generate')
  @ApiOperation({
    summary: 'Generate initial clarifying questions for schema generation',
    description: 'Initiates schema generation conversation by analyzing description and generating relevant clarifying questions'
  })
  @ApiResponse({
    status: 200,
    description: 'Clarifying questions generated successfully',
    type: GenerateSchemaResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or LLM failed to generate questions'
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async generateSchema(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateSchemaDto,
  ): Promise<GenerateSchemaResponseDto> {
    const requestId = uuidv4();

    const result = await this.schemaGeneratorService.generateInitialQuestions(
      dto.description,
      {
        businessContext: dto.businessContext,
        targetRecordCount: dto.targetRecordCount,
        domainExpertise: dto.domainExpertise,
      },
      requestId,
    );

    // Store description for later retrieval during refinement
    this.conversationDescriptions.set(result.conversationId, dto.description);

    return result;
  }

  @Post('schemas/:conversationId/refine')
  @ApiOperation({
    summary: 'Refine schema generation with user answers',
    description: 'Takes user answers to clarifying questions and generates final synthetic schema'
  })
  @ApiResponse({
    status: 200,
    description: 'Schema generated successfully',
    type: RefineSchemaResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid answers or schema generation failed'
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID from initial generation' })
  async refineSchema(
    @Param('projectId') projectId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: RefineSchemaDto,
  ): Promise<RefineSchemaResponseDto> {
    const requestId = uuidv4();

    // Retrieve original description from conversation store
    const description = this.conversationDescriptions.get(conversationId) || 'Schema refinement';

    const result = await this.schemaGeneratorService.generateSchema(
      description,
      dto.answers,
      conversationId,
      requestId,
    );

    // Clean up stored description
    this.conversationDescriptions.delete(conversationId);

    return result;
  }

  @Post('datasets/from-schema')
  @ApiOperation({
    summary: 'Create dataset from generated schema',
    description: 'Creates a new dataset with schema relationship for data generation'
  })
  @ApiResponse({
    status: 201,
    description: 'Dataset created successfully',
    schema: {
      properties: {
        datasetId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schema ID or dataset creation failed'
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async createDatasetFromSchema(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDatasetFromSchemaDto,
  ): Promise<{ datasetId: string; message: string }> {
    const dataset = await this.datasetService.create(projectId, {
      name: dto.name,
      schema: dto.schema,
    });

    return {
      datasetId: dataset.id,
      message: `Dataset "${dto.name}" created successfully`,
    };
  }

  @Delete('schemas/:requestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel in-progress schema generation',
    description: 'Cancels an ongoing schema generation request'
  })
  @ApiResponse({
    status: 200,
    description: 'Schema generation cancelled successfully',
    schema: {
      properties: {
        status: { type: 'string', example: 'cancelled' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Request ID not found'
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'requestId', description: 'Request ID to cancel' })
  async cancelSchemaGeneration(
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
  ): Promise<{ status: string; message: string }> {
    // TODO: Implement cancellation logic with request tracking
    // This will be implemented when we add request state management

    return {
      status: 'cancelled',
      message: `Schema generation request ${requestId} cancellation - to be implemented`,
    };
  }

  // ===== AI PROMPT IMPROVEMENT =====

  @Post('ai/improve-prompt')
  @ApiOperation({
    summary: 'Improve a prompt or text field using AI',
    description: 'Sends the current text to LLM for improvement based on field type and context',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async improvePrompt(
    @Param('projectId') _projectId: string,
    @Body() body: {
      text: string;
      fieldType: 'prompt' | 'description' | 'negativePrompt';
      fieldName: string;
      schemaFields?: string[];
    },
  ): Promise<{ improved: string }> {
    const { text, fieldType, fieldName, schemaFields } = body;

    const contextInfo = schemaFields?.length
      ? `\nAvailable fields in the schema: ${schemaFields.join(', ')}. Use {{fieldName}} syntax to reference other fields.`
      : '';

    let systemPrompt: string;
    let userPrompt: string;

    switch (fieldType) {
      case 'prompt':
        systemPrompt = 'You are an expert at writing prompts for synthetic data generation. Your task is to improve a prompt that will be used to instruct an LLM to generate realistic field values. Return ONLY the improved prompt text, nothing else.';
        userPrompt = `Improve this data generation prompt for a field called "${fieldName}". Make it more specific, clear, and likely to produce realistic output. Keep {{fieldName}} template variables if present.${contextInfo}\n\nCurrent prompt:\n${text}`;
        break;
      case 'description':
        systemPrompt = 'You are an expert at writing field descriptions for synthetic data schemas. Your task is to improve a field description that provides context to an LLM during data generation. Return ONLY the improved description text, nothing else.';
        userPrompt = `Improve this description for a schema field called "${fieldName}". Make it precise and informative so an LLM understands exactly what kind of data to generate.${contextInfo}\n\nCurrent description:\n${text}`;
        break;
      case 'negativePrompt':
        systemPrompt = 'You are an expert at writing negative prompts (exclusion rules) for synthetic data generation. Your task is to improve a negative prompt that tells an LLM what to avoid in its output. Return ONLY the improved negative prompt text, nothing else.';
        userPrompt = `Improve this negative prompt for a field called "${fieldName}". Make the exclusions clear, specific, and enforceable. Use imperative language (e.g. "Do not mention...", "Never include...", "Avoid...").${contextInfo}\n\nCurrent negative prompt:\n${text}`;
        break;
      default:
        throw new Error(`Unknown field type: ${fieldType}`);
    }

    const improved = await this.ollamaService.callModel(
      userPrompt,
      systemPrompt,
      0.7,
      500,
      `improve-${fieldType}-${fieldName}`,
    );

    return { improved: improved.trim() };
  }
}
