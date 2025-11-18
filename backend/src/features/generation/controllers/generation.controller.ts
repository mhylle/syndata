// backend/src/features/generation/controllers/generation.controller.ts
import { Controller, Post, Get, Body, Param, Query, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GenerationService } from '../services/generation.service';
import { SchemaGeneratorService } from '../services/schema-generator.service';
import { SchemaParserService } from '../services/schema-parser.service';
import { GenerateDto } from '../dto/generate.dto';
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
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Generation')
@Controller('projects/:projectId')
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly schemaGeneratorService: SchemaGeneratorService,
    private readonly schemaParserService: SchemaParserService,
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

    // Get original description from conversation context
    // For now, we'll need to pass it through or store it
    // This is a simplified version - in production you'd retrieve from conversation store
    const description = 'Schema refinement';

    const result = await this.schemaGeneratorService.generateSchema(
      description,
      dto.answers,
      conversationId,
      requestId,
    );

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
    // TODO: Implement dataset creation with schema relationship
    // This will be implemented in a future phase
    const datasetId = uuidv4();

    return {
      datasetId,
      message: 'Dataset creation from schema - to be implemented in Phase 4',
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
}
