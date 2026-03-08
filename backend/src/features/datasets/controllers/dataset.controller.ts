// backend/src/features/datasets/controllers/dataset.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatasetService } from '../services/dataset.service';
import { UploadService } from '../services/upload.service';
import { VersionService } from '../services/version.service';
import { CreateDatasetDto, CreateElementDto, UpdateDatasetDto } from '../dto';

@ApiTags('Datasets')
@Controller('projects/:projectId/datasets')
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService,
    private readonly uploadService: UploadService,
    private readonly versionService: VersionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dataset' })
  create(@Param('projectId') projectId: string, @Body() createDatasetDto: CreateDatasetDto) {
    return this.datasetService.create(projectId, createDatasetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get datasets for a project' })
  findByProject(@Param('projectId') projectId: string) {
    return this.datasetService.findByProject(projectId);
  }

  @Get(':datasetId')
  @ApiOperation({ summary: 'Get a specific dataset' })
  findOne(@Param('datasetId') datasetId: string) {
    return this.datasetService.findOne(datasetId);
  }

  @Put(':datasetId')
  @ApiOperation({ summary: 'Update a dataset' })
  update(@Param('datasetId') datasetId: string, @Body() updateDatasetDto: UpdateDatasetDto) {
    return this.datasetService.update(datasetId, updateDatasetDto);
  }

  @Delete(':datasetId')
  @ApiOperation({ summary: 'Delete a dataset and all related data' })
  async deleteDataset(@Param('datasetId') datasetId: string) {
    await this.datasetService.delete(datasetId);
    return { message: 'Dataset deleted successfully' };
  }

  @Post(':datasetId/elements')
  @ApiOperation({ summary: 'Add element to dataset' })
  addElement(@Param('datasetId') datasetId: string, @Body() createElementDto: CreateElementDto) {
    return this.datasetService.addElement(datasetId, createElementDto);
  }

  @Get(':datasetId/elements')
  @ApiOperation({ summary: 'Get elements for a dataset' })
  getElements(@Param('datasetId') datasetId: string) {
    return this.datasetService.getElements(datasetId);
  }

  @Get(':datasetId/elements/:elementId')
  @ApiOperation({ summary: 'Get a specific element' })
  getElement(@Param('elementId') elementId: string) {
    return this.datasetService.getElement(elementId);
  }

  // Example upload endpoints

  @Post(':datasetId/examples')
  @ApiOperation({ summary: 'Upload example data (JSON body with content and format)' })
  async uploadExamples(
    @Param('datasetId') datasetId: string,
    @Body() body: { content: string; format: 'csv' | 'json'; filename?: string },
  ) {
    if (!body.content || !body.format) {
      throw new BadRequestException('content and format are required');
    }

    const records = body.format === 'csv'
      ? this.uploadService.parseCSV(body.content)
      : this.uploadService.parseJSON(body.content);

    const example = await this.uploadService.storeExamples(
      datasetId, records, body.format, body.filename,
    );

    return { id: example.id, rowCount: example.rowCount };
  }

  @Get(':datasetId/examples')
  @ApiOperation({ summary: 'List uploaded examples for a dataset' })
  getExamples(@Param('datasetId') datasetId: string) {
    return this.uploadService.getExamples(datasetId);
  }

  @Delete(':datasetId/examples/:exampleId')
  @ApiOperation({ summary: 'Delete an uploaded example' })
  deleteExample(@Param('exampleId') exampleId: string) {
    return this.uploadService.deleteExample(exampleId);
  }

  @Post(':datasetId/detect-schema')
  @ApiOperation({ summary: 'Auto-detect schema from uploaded examples' })
  async detectSchema(@Param('datasetId') datasetId: string) {
    const examples = await this.uploadService.getExamples(datasetId);
    if (!examples.length) {
      throw new BadRequestException('No examples uploaded for this dataset');
    }

    // Combine all example records
    const allRecords = examples.flatMap(e => e.data);
    const schema = this.uploadService.detectSchema(allRecords);
    const patterns = this.uploadService.analyzePatterns(allRecords, schema);

    return { schema, patterns, totalRecords: allRecords.length };
  }

  // Version endpoints

  @Post(':datasetId/versions')
  @ApiOperation({ summary: 'Create a version snapshot of the current dataset' })
  createVersion(
    @Param('datasetId') datasetId: string,
    @Body() body: { changeDescription?: string },
  ) {
    return this.versionService.createDatasetVersion(datasetId, body?.changeDescription);
  }

  @Get(':datasetId/versions')
  @ApiOperation({ summary: 'List all versions of a dataset' })
  listVersions(@Param('datasetId') datasetId: string) {
    return this.versionService.listDatasetVersions(datasetId);
  }

  @Get(':datasetId/versions/:version')
  @ApiOperation({ summary: 'Get a specific version of a dataset' })
  getVersion(
    @Param('datasetId') datasetId: string,
    @Param('version') version: number,
  ) {
    return this.versionService.getDatasetVersion(datasetId, version);
  }

  @Post(':datasetId/versions/:version/rollback')
  @ApiOperation({ summary: 'Rollback dataset to a previous version' })
  rollbackToVersion(
    @Param('datasetId') datasetId: string,
    @Param('version') version: number,
  ) {
    return this.versionService.rollbackDatasetToVersion(datasetId, version);
  }
}
