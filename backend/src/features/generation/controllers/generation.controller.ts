// backend/src/features/generation/controllers/generation.controller.ts
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GenerationService } from '../services/generation.service';
import { GenerateDto } from '../dto/generate.dto';

@ApiTags('Generation')
@Controller('projects/:projectId')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Trigger synthetic data generation' })
  generate(@Param('projectId') projectId: string, @Body() generateDto: GenerateDto) {
    return this.generationService.generate(projectId, generateDto);
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
}
